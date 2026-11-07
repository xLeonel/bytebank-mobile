import type { Category } from './category';

/**
 * Tipo de transação — o valor canônico, nunca o rótulo.
 *
 * Na Fase 2 o objeto de UI carregava o rótulo exibido ("Transferência Pix") no
 * mesmo campo usado para gravar, e a tradução acontecia em três lugares
 * diferentes. Isso produziu bugs de ida-e-volta (cadastrava-se "Transferência
 * Pix" e o extrato mostrava "Pix") e um tipo fantasma no enum. Aqui o valor
 * canônico é o único que circula; o rótulo é derivado só na hora de exibir.
 */
export type TransactionType = 'saque' | 'deposito' | 'pix';

/**
 * Destino de um depósito. Define o sinal do valor: na própria conta credita,
 * em outra conta debita — o dinheiro sai daqui. Só se aplica a 'deposito'.
 */
export type DepositType = 'own' | 'other';

/** Recibo anexado. O arquivo vive no Storage; aqui ficam só as referências. */
export type Attachment = {
  name: string;
  /** MIME type, ex.: "image/jpeg", "application/pdf". */
  type: string;
  /** Caminho no Storage: users/{uid}/receipts/{txId}/{arquivo}. */
  path: string;
  /** Download URL pública gerada pelo Storage. */
  url: string;
};

/** Transação no formato usado pelo app (já convertida do Firestore). */
export type Transaction = {
  id: string;
  type: TransactionType;
  depositType?: DepositType;
  /** Já com sinal: negativo debita, positivo credita. */
  amount: number;
  date: Date;
  description?: string;
  category?: Category;
  agency?: string;
  account?: string;
  pixKey?: string;
  attachments: Attachment[];
  createdAt: Date;
};

/** Dados de entrada para criar/editar — sem id, sem sinal aplicado. */
export type TransactionInput = {
  type: TransactionType;
  depositType?: DepositType;
  /** Sempre positivo; o sinal é aplicado por `applySign`. */
  amount: number;
  date: Date;
  description?: string;
  category?: Category;
  agency?: string;
  account?: string;
  pixKey?: string;
};

/** Dados prontos para gravar: como a entrada, mas com o sinal já aplicado. */
export type TransactionRecord = Omit<TransactionInput, 'amount'> & {
  /** Negativo debita, positivo credita. */
  amount: number;
};

export type Filtros = {
  type?: TransactionType;
  category?: Category;
  /** Início do intervalo, inclusivo. */
  de?: Date;
  /** Fim do intervalo, inclusivo. */
  ate?: Date;
};
