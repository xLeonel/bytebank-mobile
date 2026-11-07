import type {
  Attachment,
  Filtros,
  Transaction,
  TransactionRecord,
} from '@/modules/transactions/domain/types';

/**
 * Posição numa listagem paginada.
 *
 * Opaco de propósito: no Firestore é um snapshot de documento, mas quem pagina
 * só precisa devolvê-lo na chamada seguinte. Sem a marca, o tipo do Firestore
 * vazaria até a tela do extrato.
 */
declare const cursorDePagina: unique symbol;
export type CursorDePagina = { readonly [cursorDePagina]: true };

export type Pagina = {
  itens: Transaction[];
  /** Passe de volta em `cursor` para buscar a página seguinte. */
  cursor: CursorDePagina | null;
  acabou: boolean;
};

export type OpcoesDePagina = {
  filtros?: Filtros;
  cursor?: CursorDePagina | null;
  tamanho?: number;
};

export type TransactionRepository = {
  buscarPagina: (uid: string, opcoes?: OpcoesDePagina) => Promise<Pagina>;
  /** Assina todas as transações do usuário; o retorno cancela a assinatura. */
  observarTodas: (
    uid: string,
    aoMudar: (transacoes: Transaction[]) => void,
    aoFalhar?: (erro: Error) => void,
  ) => () => void;
  buscarPorId: (uid: string, id: string) => Promise<Transaction | null>;
  criar: (uid: string, registro: TransactionRecord) => Promise<string>;
  atualizar: (uid: string, id: string, registro: TransactionRecord) => Promise<void>;
  remover: (uid: string, id: string) => Promise<void>;
  adicionarAnexo: (uid: string, id: string, anexo: Attachment) => Promise<void>;
  removerAnexo: (uid: string, id: string, anexo: Attachment) => Promise<void>;
};

export type ReceiptStorage = {
  enviar: (
    uid: string,
    txId: string,
    uriLocal: string,
    nomeArquivo: string,
  ) => Promise<Pick<Attachment, 'path' | 'url'>>;
  remover: (path: string) => Promise<void>;
};
