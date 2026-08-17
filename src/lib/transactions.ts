import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as limitTo,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { applySign } from '@/domain/transaction';
import type { Category } from '@/domain/category';
import type { Transaction, TransactionInput, TransactionType } from '@/domain/types';
import { db } from '@/lib/firebase';

/** Subcoleção do usuário — o uid no caminho é o que a Security Rule verifica. */
function colecao(uid: string) {
  return collection(db, 'users', uid, 'transactions');
}

/**
 * Firestore -> domínio.
 *
 * `date` e `createdAt` chegam como Timestamp e viram Date aqui, na fronteira.
 * Nada além deste arquivo lida com Timestamp: manter tipo de infraestrutura
 * vazando pelo app foi o que, na Fase 2, fez a data virar string "DD/MM/YYYY"
 * cedo demais e perder a hora.
 */
function paraDominio(snap: QueryDocumentSnapshot<DocumentData>): Transaction {
  const d = snap.data();
  return {
    id: snap.id,
    type: d.type as TransactionType,
    depositType: d.depositType,
    amount: d.amount,
    date: (d.date as Timestamp).toDate(),
    // createdAt pode vir null no instante entre a escrita local e a confirmação
    // do servidor (serverTimestamp ainda pendente); cai para a data da transação.
    createdAt: (d.createdAt as Timestamp | null)?.toDate() ?? (d.date as Timestamp).toDate(),
    description: d.description,
    category: d.category as Category | undefined,
    agency: d.agency,
    account: d.account,
    pixKey: d.pixKey,
    attachments: d.attachments ?? [],
  };
}

/** Remove chaves indefinidas: o Firestore recusa `undefined` em campo. */
function semUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export type Filtros = {
  type?: TransactionType;
  category?: Category;
  /** Início do intervalo, inclusivo. */
  de?: Date;
  /** Fim do intervalo, inclusivo. */
  ate?: Date;
};

/** Ordenação base de toda consulta. Ver domain/transaction.ordenarPorDataDesc. */
const ORDENACAO: QueryConstraint[] = [orderBy('date', 'desc'), orderBy('createdAt', 'desc')];

function restricoes(filtros: Filtros): QueryConstraint[] {
  const cs: QueryConstraint[] = [];
  if (filtros.type) cs.push(where('type', '==', filtros.type));
  if (filtros.category) cs.push(where('category', '==', filtros.category));
  if (filtros.de) cs.push(where('date', '>=', Timestamp.fromDate(filtros.de)));
  if (filtros.ate) cs.push(where('date', '<=', Timestamp.fromDate(filtros.ate)));
  return cs;
}

export type Pagina = {
  itens: Transaction[];
  /** Passe de volta em `cursor` para buscar a página seguinte. */
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  acabou: boolean;
};

/**
 * Uma página de transações, para o scroll infinito do extrato.
 *
 * Pagina por cursor (`startAfter`) e não por offset: o Firestore não tem
 * offset barato, e cursor mantém a página estável mesmo se algo for inserido
 * no meio enquanto o usuário rola.
 */
export async function buscarPagina(
  uid: string,
  opcoes: { filtros?: Filtros; cursor?: QueryDocumentSnapshot<DocumentData> | null; tamanho?: number } = {},
): Promise<Pagina> {
  const { filtros = {}, cursor = null, tamanho = 20 } = opcoes;

  const q = query(
    colecao(uid),
    ...restricoes(filtros),
    ...ORDENACAO,
    ...(cursor ? [startAfter(cursor)] : []),
    limitTo(tamanho),
  );

  const snap = await getDocs(q);
  return {
    itens: snap.docs.map(paraDominio),
    cursor: snap.docs.at(-1) ?? null,
    acabou: snap.docs.length < tamanho,
  };
}

/**
 * Observa TODAS as transações do usuário, em tempo real.
 *
 * Usado pelo saldo e pelos gráficos, que precisam do conjunto completo — um
 * saldo calculado sobre uma página seria simplesmente errado. Para a listagem
 * existe `buscarPagina`, porque ali o volume é o problema.
 */
export function observarTodas(
  uid: string,
  aoMudar: (transacoes: Transaction[]) => void,
  aoFalhar?: (erro: Error) => void,
) {
  return onSnapshot(
    query(colecao(uid), ...ORDENACAO),
    (snap) => aoMudar(snap.docs.map(paraDominio)),
    (erro) => aoFalhar?.(erro),
  );
}

export async function criarTransacao(uid: string, entrada: TransactionInput): Promise<string> {
  const { amount, type, depositType, date, ...resto } = entrada;

  const ref = await addDoc(
    colecao(uid),
    semUndefined({
      ...resto,
      type,
      depositType: type === 'deposito' ? depositType : undefined,
      // A regra do sinal vive no domínio, um lugar só.
      amount: applySign(type, depositType, amount),
      date: Timestamp.fromDate(date),
      attachments: [],
      // serverTimestamp evita depender do relógio do aparelho para o desempate
      // de ordenação entre transações do mesmo dia.
      createdAt: serverTimestamp(),
    }),
  );
  return ref.id;
}

export async function atualizarTransacao(
  uid: string,
  id: string,
  entrada: TransactionInput,
): Promise<void> {
  const { amount, type, depositType, date, ...resto } = entrada;

  await updateDoc(
    doc(db, 'users', uid, 'transactions', id),
    semUndefined({
      ...resto,
      type,
      depositType: type === 'deposito' ? depositType : undefined,
      amount: applySign(type, depositType, amount),
      date: Timestamp.fromDate(date),
    }),
  );
}

export async function removerTransacao(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'transactions', id));
}
