import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { calcularSaldo } from '@/domain/transaction';
import type { Transaction, TransactionInput } from '@/domain/types';
import {
  atualizarTransacao,
  criarTransacao,
  observarTodas,
  removerTransacao,
} from '@/lib/transactions';

type TransactionsContextValue = {
  /** Todas as transações do usuário, da mais recente para a mais antiga. */
  transacoes: Transaction[];
  /** Soma dos valores já com sinal. */
  saldo: number;
  carregando: boolean;
  erro: string | null;
  criar: (entrada: TransactionInput) => Promise<string>;
  atualizar: (id: string, entrada: TransactionInput) => Promise<void>;
  remover: (id: string) => Promise<void>;
};

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
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
    if (!user) {
      setTransacoes([]);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro(null);

    const cancelar = observarTodas(
      user.uid,
      (lista) => {
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
  }, [user]);

  const exigirUsuario = useCallback(() => {
    if (!user) throw new Error('Sessão expirada. Entre novamente.');
    return user.uid;
  }, [user]);

  const criar = useCallback(
    (entrada: TransactionInput) => criarTransacao(exigirUsuario(), entrada),
    [exigirUsuario],
  );

  const atualizar = useCallback(
    (id: string, entrada: TransactionInput) => atualizarTransacao(exigirUsuario(), id, entrada),
    [exigirUsuario],
  );

  const remover = useCallback(
    (id: string) => removerTransacao(exigirUsuario(), id),
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
