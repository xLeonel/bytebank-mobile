import type {
  Attachment,
  DepositType,
  Transaction,
  TransactionInput,
  TransactionRecord,
  TransactionType,
} from './types';

/**
 * Rótulos exibidos. São exatamente as opções do formulário de cadastro, para o
 * tipo mostrado no extrato e nos gráficos ser o mesmo que o usuário escolheu.
 */
export const TYPE_LABEL: Record<TransactionType, string> = {
  saque: 'Saque',
  deposito: 'Depósito',
  pix: 'Transferência Pix',
};

/** Para seletores em que as opções dividem uma linha; a lista segue com o rótulo completo. */
export const TYPE_LABEL_CURTO: Record<TransactionType, string> = {
  ...TYPE_LABEL,
  pix: 'Pix',
};

/** Ordem de exibição nos seletores. */
export const TRANSACTION_TYPES: TransactionType[] = ['deposito', 'saque', 'pix'];

export const DEPOSIT_TYPE_LABEL: Record<DepositType, string> = {
  own: 'Na minha conta',
  other: 'Em outra conta',
};

/**
 * Aplica o sinal do valor conforme o destino do dinheiro.
 *
 * O sinal depende do destino, não só do tipo: saque e Pix sempre saem desta
 * conta; depósito credita quando é na própria conta, mas debita quando é em
 * outra — nesse caso o dinheiro sai daqui. Na Fase 2 isso era decidido só pelo
 * tipo, e todo depósito somava ao saldo, inclusive os feitos para terceiros.
 *
 * @param valorAbsoluto valor sempre positivo, como digitado no formulário
 */
export function applySign(
  type: TransactionType,
  depositType: DepositType | undefined,
  valorAbsoluto: number,
): number {
  const magnitude = Math.abs(valorAbsoluto);
  const debita =
    type === 'saque' ||
    type === 'pix' ||
    (type === 'deposito' && depositType === 'other');
  return debita ? -magnitude : magnitude;
}

/**
 * Entrada do formulário -> dados a gravar.
 *
 * O destino só faz sentido em depósito; em outro tipo seria ruído no documento.
 * A regra do sinal vive aqui, um lugar só.
 */
export function paraRegistro(entrada: TransactionInput): TransactionRecord {
  const { type, depositType, amount } = entrada;
  return {
    ...entrada,
    depositType: type === 'deposito' ? depositType : undefined,
    amount: applySign(type, depositType, amount),
  };
}

/** Referência de um recibo já enviado, com o MIME type derivado do nome. */
export function criarAnexo(nome: string, path: string): Attachment {
  return {
    name: nome,
    type: nome.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
    path,
  };
}

/** Um lançamento credita a conta? */
export function isCredito(tx: Pick<Transaction, 'amount'>): boolean {
  return tx.amount > 0;
}

/** Saldo = soma dos valores já com sinal. */
export function calcularSaldo(transactions: Transaction[]): number {
  return transactions.reduce((acc, tx) => acc + tx.amount, 0);
}

/**
 * Ordena da mais recente para a mais antiga, desempatando por `createdAt`.
 *
 * O Firestore já devolve nessa ordem (orderBy date desc, createdAt desc); isto
 * é rede de segurança para listas montadas no cliente — concatenação de
 * páginas, inserção otimista após criar — não dependerem da ordem de chegada.
 * O desempate importa porque o formulário grava a data sem hora, então várias
 * transações do mesmo dia empatam em `date`.
 */
export function ordenarPorDataDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const porData = b.date.getTime() - a.date.getTime();
    if (porData) return porData;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
