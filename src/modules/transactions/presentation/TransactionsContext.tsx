import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { casosDeTransacoes } from '@/composition/container';
import { useAuth } from '@/modules/auth/presentation/AuthContext';
import { calcularSaldo } from '@/modules/transactions/domain/transaction';
import type { Transaction, TransactionInput } from '@/modules/transactions/domain/types';
import { iniciarMedicao } from '@/shared/ui/marcarPerf';

type TransactionsContextValue = {
  /** Todas as transações do usuário, da mais recente para a mais antiga. */
  transacoes: Transaction[];
  /** Soma dos valores já com sinal. */
  saldo: number;
  carregando: boolean;
  erro: string | null;
  /** Com `uriRecibo`, também anexa o comprovante; ver `registrar` nos casos de uso. */
  criar: (
    entrada: TransactionInput,
    uriRecibo?: string | null,
  ) => Promise<{ id: string; erroDoRecibo?: Error }>;
  atualizar: (id: string, entrada: TransactionInput) => Promise<void>;
  remover: (id: string) => Promise<void>;
};

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

type Carga = { uid: string; lista: Transaction[]; erro: string | null };

const SEM_TRANSACOES: Transaction[] = [];

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const uid = useAuth().user?.uid;
  const [carga, setCarga] = useState<Carga | null>(null);

  // A carga só vale para o usuário que a pediu: trocar de sessão a invalida aqui
  // mesmo, sem um efeito para limpar o estado e um render com o dado anterior.
  const cargaAtual = carga?.uid === uid ? carga : null;
  const transacoes = cargaAtual?.lista ?? SEM_TRANSACOES;
  const erro = cargaAtual?.erro ?? null;
  const carregando = !!uid && !cargaAtual;

  /**
   * Assina o conjunto completo, não uma página.
   *
   * Saldo e gráficos precisam de tudo — saldo calculado sobre uma página seria
   * simplesmente errado. A listagem do extrato tem paginação própria, via
   * `buscarPagina`, porque lá o volume é que importa.
   *
   * Em tempo real: criar uma transação já reflete no saldo sem refetch, o que
   * na Fase 2 exigia um evento no bus entre microfrontends.
   */
  useEffect(() => {
    if (!uid) return;

    let medirPrimeiraCarga: (() => void) | null = iniciarMedicao('primeira carga das transacoes');

    const cancelar = casosDeTransacoes.observarTodas(
      uid,
      (lista) => {
        medirPrimeiraCarga?.();
        medirPrimeiraCarga = null;
        setCarga({ uid, lista, erro: null });
      },
      (e) => {
        // A causa mais comum aqui é regra de segurança ou índice ausente — o
        // Firestore devolve a mensagem com o link para criar o índice.
        setCarga((atual) => ({
          uid,
          lista: atual?.uid === uid ? atual.lista : SEM_TRANSACOES,
          erro: e.message,
        }));
      },
    );

    return cancelar;
  }, [uid]);

  const exigirUsuario = useCallback(() => {
    if (!uid) throw new Error('Sessão expirada. Entre novamente.');
    return uid;
  }, [uid]);

  const criar = useCallback(
    (entrada: TransactionInput, uriRecibo?: string | null) =>
      casosDeTransacoes.registrar(exigirUsuario(), entrada, uriRecibo),
    [exigirUsuario],
  );

  const atualizar = useCallback(
    (id: string, entrada: TransactionInput) =>
      casosDeTransacoes.atualizar(exigirUsuario(), id, entrada),
    [exigirUsuario],
  );

  const remover = useCallback(
    (id: string) => casosDeTransacoes.remover(exigirUsuario(), id),
    [exigirUsuario],
  );

  // Sem escrita otimista: o onSnapshot do Firestore já atualiza a lista local
  // antes de confirmar com o servidor. Duplicar isso à mão criaria o risco de
  // item fantasma quando a escrita falha.
  const saldo = useMemo(() => calcularSaldo(transacoes), [transacoes]);

  const value = useMemo(
    () => ({ transacoes, saldo, carregando, erro, criar, atualizar, remover }),
    [transacoes, saldo, carregando, erro, criar, atualizar, remover],
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

export function useTransactions(): TransactionsContextValue {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions precisa estar dentro de TransactionsProvider');
  return ctx;
}
