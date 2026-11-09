import { Observable, Subject } from 'rxjs';
import { createStore } from 'zustand/vanilla';

import { calcularSaldo } from '@/modules/transactions/domain/transaction';
import type { Transaction } from '@/modules/transactions/domain/types';

import type { CacheDeTransacoes, TransactionRepository } from './ports';

export type EstadoDasTransacoes = {
  /** Todas as transações do usuário, da mais recente para a mais antiga. */
  transacoes: Transaction[];
  /** Soma dos valores já com sinal. */
  saldo: number;
  carregando: boolean;
  erro: string | null;
  /** A lista veio do cache e o servidor ainda não respondeu. */
  doCache: boolean;
};

const INICIAL: EstadoDasTransacoes = {
  transacoes: [],
  saldo: 0,
  carregando: true,
  erro: null,
  doCache: false,
};

/** Uma escrita gera mais de uma atualização; grava só depois de elas pararem. */
const ESPERA_PARA_GRAVAR = 1000;

/**
 * Transações do usuário em tempo real.
 *
 * Assina o conjunto completo, não uma página: saldo e gráficos precisam de tudo,
 * e um saldo calculado sobre uma página seria simplesmente errado. A listagem do
 * extrato tem paginação própria (ver extratoStore), porque lá o volume é que
 * importa.
 *
 * Com um cache, a tela abre com a última lista conhecida enquanto a resposta do
 * servidor não chega, e a resposta substitui a lista assim que chega.
 */
export function criarStoreDasTransacoes(
  repositorio: Pick<TransactionRepository, 'observarTodas'>,
  cache?: CacheDeTransacoes,
  esperaParaGravar = ESPERA_PARA_GRAVAR,
) {
  const store = createStore<EstadoDasTransacoes>(() => INICIAL);
  const alteracoes = new Subject<void>();

  return {
    store,

    /** Avisa quando a lista muda depois da primeira carga. */
    alteracoes$: alteracoes.asObservable(),

    /**
     * Mantém a store em dia com o usuário informado até o retorno ser chamado.
     *
     * Encerrar limpa o estado: depois de sair da conta, as transações de um
     * usuário não podem continuar em memória à espera do próximo.
     */
    sincronizar(uid: string): () => void {
      let primeiraCarga = true;
      let encerrado = false;
      let gravacao: ReturnType<typeof setTimeout> | undefined;

      // Falhar ao ler o cache só significa abrir como antes, esperando o servidor.
      cache
        ?.ler(uid)
        .then((transacoes) => {
          if (encerrado || !primeiraCarga || !transacoes) return;
          store.setState({
            transacoes,
            saldo: calcularSaldo(transacoes),
            carregando: false,
            erro: null,
            doCache: true,
          });
        })
        .catch(() => {});

      const assinatura = new Observable<Transaction[]>((assinante) =>
        repositorio.observarTodas(
          uid,
          (lista) => assinante.next(lista),
          (erro) => assinante.error(erro),
        ),
      ).subscribe({
        next(transacoes) {
          store.setState({
            transacoes,
            saldo: calcularSaldo(transacoes),
            carregando: false,
            erro: null,
            doCache: false,
          });
          if (!primeiraCarga) alteracoes.next();
          primeiraCarga = false;

          if (cache) {
            clearTimeout(gravacao);
            gravacao = setTimeout(() => void cache.gravar(uid, transacoes).catch(() => {}), esperaParaGravar);
          }
        },
        // A causa mais comum aqui é regra de segurança ou índice ausente — o
        // Firestore devolve a mensagem com o link para criar o índice.
        error(erro: Error) {
          store.setState({ carregando: false, erro: erro.message });
        },
      });

      return () => {
        encerrado = true;
        clearTimeout(gravacao);
        assinatura.unsubscribe();
        store.setState(INICIAL, true);
        // Encerrar é sair da conta: os dados dela não ficam no aparelho.
        void cache?.limpar(uid).catch(() => {});
      };
    },
  };
}
