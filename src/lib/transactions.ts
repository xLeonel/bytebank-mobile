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

import { applySign } from '@/domain/transaction';
import type { Category } from '@/domain/category';
import type { Attachment, Transaction, TransactionInput, TransactionType } from '@/domain/types';
import { db } from '@/lib/firebase';
import { enviarArquivo, removerArquivo } from '@/lib/storage';

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

/**
 * Anexa um recibo à transação: envia ao Storage e grava a referência no
 * documento.
 *
 * O arquivo só sobe depois de a transação existir, porque o caminho no bucket
 * inclui o id dela — assim o recibo fica amarrado à transação e a regra de
 * segurança consegue verificar o dono pelo próprio caminho.
 *
 * A gravação usa arrayUnion em vez de reescrever a lista: se duas telas
 * anexarem quase ao mesmo tempo, nenhuma apaga o anexo da outra.
 */
export async function anexarRecibo(
  uid: string,
  txId: string,
  uriLocal: string,
  nomeArquivo: string,
): Promise<Attachment> {
  const caminho = `users/${uid}/receipts/${txId}/${nomeArquivo}`;
  const url = await enviarArquivo(caminho, uriLocal);

  const anexo: Attachment = {
    name: nomeArquivo,
    type: nomeArquivo.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
    path: caminho,
    url,
  };

  await updateDoc(doc(db, 'users', uid, 'transactions', txId), {
    attachments: arrayUnion(anexo),
  });

  return anexo;
}

/** Remove o recibo do Storage e a referência do documento. */
export async function removerRecibo(
  uid: string,
  txId: string,
  anexo: Attachment,
): Promise<void> {
  await removerArquivo(anexo.path);
  await updateDoc(doc(db, 'users', uid, 'transactions', txId), {
    attachments: arrayRemove(anexo),
  });
}

/** Uma transação específica, para a tela de edição. */
export async function buscarTransacao(uid: string, id: string): Promise<Transaction | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'transactions', id));
  if (!snap.exists()) return null;
  return paraDominio(snap as QueryDocumentSnapshot<DocumentData>);
}
