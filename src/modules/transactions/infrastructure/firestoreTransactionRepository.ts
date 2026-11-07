import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
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

import type {
  CursorDePagina,
  TransactionRepository,
} from '@/modules/transactions/application/ports';
import type { Category } from '@/modules/transactions/domain/category';
import type {
  Filtros,
  Transaction,
  TransactionType,
} from '@/modules/transactions/domain/types';
import { db } from '@/shared/infrastructure/firebase';

/** Subcoleção do usuário — o uid no caminho é o que a Security Rule verifica. */
function colecao(uid: string) {
  return collection(db, 'users', uid, 'transactions');
}

function documento(uid: string, id: string) {
  return doc(db, 'users', uid, 'transactions', id);
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

export const firestoreTransactionRepository: TransactionRepository = {
  /**
   * Uma página de transações, para o scroll infinito do extrato.
   *
   * Pagina por cursor (`startAfter`) e não por offset: o Firestore não tem
   * offset barato, e cursor mantém a página estável mesmo se algo for inserido
   * no meio enquanto o usuário rola.
   */
  async buscarPagina(uid, { filtros = {}, cursor = null, tamanho = 20 } = {}) {
    const q = query(
      colecao(uid),
      ...restricoes(filtros),
      ...ORDENACAO,
      ...(cursor ? [startAfter(cursor as unknown as QueryDocumentSnapshot<DocumentData>)] : []),
      limitTo(tamanho),
    );

    const snap = await getDocs(q);
    return {
      itens: snap.docs.map(paraDominio),
      cursor: (snap.docs.at(-1) ?? null) as unknown as CursorDePagina | null,
      acabou: snap.docs.length < tamanho,
    };
  },

  /**
   * Observa TODAS as transações do usuário, em tempo real.
   *
   * Usado pelo saldo e pelos gráficos, que precisam do conjunto completo — um
   * saldo calculado sobre uma página seria simplesmente errado. Para a listagem
   * existe `buscarPagina`, porque ali o volume é o problema.
   */
  observarTodas(uid, aoMudar, aoFalhar) {
    return onSnapshot(
      query(colecao(uid), ...ORDENACAO),
      (snap) => aoMudar(snap.docs.map(paraDominio)),
      (erro) => aoFalhar?.(erro),
    );
  },

  async buscarPorId(uid, id) {
    const snap = await getDoc(documento(uid, id));
    if (!snap.exists()) return null;
    return paraDominio(snap as QueryDocumentSnapshot<DocumentData>);
  },

  async criar(uid, { date, ...resto }) {
    const ref = await addDoc(
      colecao(uid),
      semUndefined({
        ...resto,
        date: Timestamp.fromDate(date),
        attachments: [],
        // serverTimestamp evita depender do relógio do aparelho para o desempate
        // de ordenação entre transações do mesmo dia.
        createdAt: serverTimestamp(),
      }),
    );
    return ref.id;
  },

  async atualizar(uid, id, { date, ...resto }) {
    await updateDoc(
      documento(uid, id),
      semUndefined({ ...resto, date: Timestamp.fromDate(date) }),
    );
  },

  async remover(uid, id) {
    await deleteDoc(documento(uid, id));
  },

  // arrayUnion em vez de reescrever a lista: se duas telas anexarem quase ao
  // mesmo tempo, nenhuma apaga o anexo da outra.
  async adicionarAnexo(uid, id, anexo) {
    await updateDoc(documento(uid, id), { attachments: arrayUnion(anexo) });
  },

  async removerAnexo(uid, id, anexo) {
    await updateDoc(documento(uid, id), { attachments: arrayRemove(anexo) });
  },
};
