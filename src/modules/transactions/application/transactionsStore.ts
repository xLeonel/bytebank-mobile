import { Observable, Subject } from 'rxjs';
import { createStore } from 'zustand/vanilla';

import { calcularSaldo } from '@/modules/transactions/domain/transaction';
import type { Transaction } from '@/modules/transactions/domain/types';

import type { TransactionRepository } from './ports';

export type EstadoDasTransacoes = {
  /** Todas as transações do usuário, da mais recente para a mais antiga. */
  transacoes: Transaction[];
  /** Soma dos valores já com sinal. */
  saldo: number;
  carregando: boolean;
  erro: string | null;
};

const INICIAL: EstadoDasTransacoes = { transacoes: [], saldo: 0, carregando: true, erro: null };

/**
 * Transações do usuário em tempo real.
 *
 * Assina o conjunto completo, não uma página: saldo e gráficos precisam de tudo,
 * e um saldo calculado sobre uma página seria simplesmente errado. A listagem do
 * extrato tem paginação própria (ver extratoStore), porque lá o volume é que
 * importa.
 */
export function criarStoreDasTransacoes(repositorio: Pick<TransactionRepository, 'observarTodas'>) {
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
          });
          if (!primeiraCarga) alteracoes.next();
          primeiraCarga = false;
        },
        // A causa mais comum aqui é regra de segurança ou índice ausente — o
        // Firestore devolve a mensagem com o link para criar o índice.
        error(erro: Error) {
          store.setState({ carregando: false, erro: erro.message });
        },
      });

      return () => {
        assinatura.unsubscribe();
        store.setState(INICIAL, true);
      };
    },
  };
}
