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

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const uid = useAuth().user?.uid;
  const [transacoes, setTransacoes] = useState<Transaction[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

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
    if (!uid) {
      setTransacoes([]);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro(null);

    let medirPrimeiraCarga: (() => void) | null = iniciarMedicao('primeira carga das transacoes');

    const cancelar = casosDeTransacoes.observarTodas(
      uid,
      (lista) => {
        medirPrimeiraCarga?.();
        medirPrimeiraCarga = null;
        setTransacoes(lista);
        setCarregando(false);
      },
      (e) => {
        // A causa mais comum aqui é regra de segurança ou índice ausente — o
        // Firestore devolve a mensagem com o link para criar o índice.
        setErro(e.message);
        setCarregando(false);
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
