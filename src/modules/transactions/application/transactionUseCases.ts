import { criarAnexo, paraRegistro } from '@/modules/transactions/domain/transaction';
import type { Attachment, TransactionInput } from '@/modules/transactions/domain/types';

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
  async function anexarRecibo(uid: string, txId: string, uriLocal: string): Promise<Attachment> {
    const nome = `recibo-${Date.now()}.jpg`;
    const { path, url } = await recibos.enviar(uid, txId, uriLocal, nome);
    const anexo = criarAnexo(nome, path, url);
    await repositorio.adicionarAnexo(uid, txId, anexo);
    return anexo;
  }

  return {
    buscarPagina: repositorio.buscarPagina,
    observarTodas: repositorio.observarTodas,
    buscarPorId: repositorio.buscarPorId,
    remover: repositorio.remover,
    anexarRecibo,

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
    async removerRecibo(uid: string, txId: string, anexo: Attachment): Promise<void> {
      await recibos.remover(anexo.path);
      await repositorio.removerAnexo(uid, txId, anexo);
    },
  };
}
