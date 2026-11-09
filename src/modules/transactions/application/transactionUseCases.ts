import { criarAnexo, paraRegistro } from '@/modules/transactions/domain/transaction';
import type {
  AnexoVisivel,
  Attachment,
  TransactionInput,
} from '@/modules/transactions/domain/types';

import type { ReceiptStorage, TransactionRepository } from './ports';

type Dependencias = {
  repositorio: TransactionRepository;
  recibos: ReceiptStorage;
};

export function criarCasosDeUsoDeTransacoes({ repositorio, recibos }: Dependencias) {
  /**
   * Anexa um recibo à transação: envia o arquivo e grava a referência no
   * documento.
   *
   * O arquivo só sobe depois de a transação existir, porque o caminho no bucket
   * inclui o id dela — assim o recibo fica amarrado à transação e a regra de
   * segurança consegue verificar o dono pelo próprio caminho.
   */
  async function anexarRecibo(uid: string, txId: string, uriLocal: string): Promise<AnexoVisivel> {
    const nome = `recibo-${Date.now()}.jpg`;
    const path = await recibos.enviar(uid, txId, uriLocal, nome);
    const anexo = criarAnexo(nome, path);
    await repositorio.adicionarAnexo(uid, txId, anexo);
    return { ...anexo, url: await recibos.obterUrl(path) };
  }

  return {
    buscarPagina: repositorio.buscarPagina,
    observarTodas: repositorio.observarTodas,
    buscarPorId: repositorio.buscarPorId,
    anexarRecibo,

    /**
     * Resolve as URLs só na hora de exibir. Um arquivo que falhar fica sem imagem,
     * mas continua na lista para o usuário conseguir removê-lo.
     */
    comUrls(anexos: Attachment[]): Promise<AnexoVisivel[]> {
      return Promise.all(
        anexos.map(async (anexo) => ({
          ...anexo,
          url: await recibos.obterUrl(anexo.path).catch(() => ''),
        })),
      );
    },

    /**
     * Exclui a transação e os recibos dela, que são dados financeiros e não podem
     * sobrar no bucket sem dono visível.
     *
     * O documento sai primeiro: se um arquivo falhar, sobra só um arquivo órfão,
     * invisível para o usuário. Na ordem inversa, uma falha deixaria a transação
     * apontando para recibos que já não existem.
     */
    async remover(uid: string, id: string): Promise<void> {
      const transacao = await repositorio.buscarPorId(uid, id);
      await repositorio.remover(uid, id);

      const resultados = await Promise.allSettled(
        (transacao?.attachments ?? []).map((anexo) => recibos.remover(anexo.path)),
      );
      const falhas = resultados.filter((r) => r.status === 'rejected').length;
      if (falhas) console.warn(`[recibo] ${falhas} arquivo(s) nao removido(s) do armazenamento`);
    },

    /**
     * Registra a transação e, se houver, o recibo escolhido no formulário.
     *
     * Se o upload falhar, a transação continua válida — o comprovante pode ser
     * anexado depois, na edição. Por isso a falha volta no resultado em vez de
     * derrubar o cadastro.
     */
    async registrar(
      uid: string,
      entrada: TransactionInput,
      uriRecibo?: string | null,
    ): Promise<{ id: string; erroDoRecibo?: Error }> {
      const id = await repositorio.criar(uid, paraRegistro(entrada));
      if (!uriRecibo) return { id };

      try {
        await anexarRecibo(uid, id, uriRecibo);
        return { id };
      } catch (e) {
        return { id, erroDoRecibo: e as Error };
      }
    },

    atualizar(uid: string, id: string, entrada: TransactionInput): Promise<void> {
      return repositorio.atualizar(uid, id, paraRegistro(entrada));
    },

    /** Remove o arquivo e a referência do documento. */
    async removerRecibo(uid: string, txId: string, path: string): Promise<void> {
      await recibos.remover(path);
      await repositorio.removerAnexo(uid, txId, path);
    },
  };
}
