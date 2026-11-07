import type { Transaction, TransactionType } from '@/modules/transactions/domain/types';
import { monthKey } from '@/shared/domain/format';

/** Totais de entrada e saída de um mês. */
export type TotaisDoMes = {
  /** "YYYY-MM" — usado para ordenar cronologicamente. */
  chave: string;
  /** "ago/26" — usado no eixo. */
  rotulo: string;
  entradas: number;
  saidas: number;
};

/** Volume líquido de um tipo, com a direção que a cor vai codificar. */
export type TotalPorTipo = {
  type: TransactionType;
  /** Módulo do líquido. */
  total: number;
  direcao: 'entrada' | 'saida';
};

/** Ponto da curva de saldo. */
export type PontoDeSaldo = {
  data: Date;
  saldo: number;
};

const MESES_CURTOS = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

function rotuloDoMes(data: Date): string {
  return `${MESES_CURTOS[data.getMonth()]}/${String(data.getFullYear()).slice(-2)}`;
}

/**
 * Entradas e saídas somadas por mês, em ordem cronológica.
 *
 * Saídas viram valor absoluto: um gráfico de barras compara magnitudes, e
 * plotar a saída negativa jogaria a barra para baixo do eixo, sugerindo uma
 * escala divergente que não é o caso aqui.
 */
export function agruparPorMes(transacoes: Transaction[], meses = 6): TotaisDoMes[] {
  const porMes = new Map<string, TotaisDoMes>();

  for (const tx of transacoes) {
    const chave = monthKey(tx.date);
    if (!porMes.has(chave)) {
      porMes.set(chave, { chave, rotulo: rotuloDoMes(tx.date), entradas: 0, saidas: 0 });
    }
    const totais = porMes.get(chave)!;
    if (tx.amount > 0) totais.entradas += tx.amount;
    else totais.saidas += Math.abs(tx.amount);
  }

  return Array.from(porMes.values())
    .sort((a, b) => a.chave.localeCompare(b.chave))
    .slice(-meses);
}

/**
 * Volume líquido por tipo, do maior para o menor.
 *
 * Soma COM sinal e só depois tira o módulo. Um tipo não tem direção fixa:
 * "Depósito" pode ter lançamentos positivos (própria conta) e negativos (outra
 * conta). Fixar a direção pela primeira transação encontrada — como a primeira
 * versão do gráfico da Fase 2 fazia — pintava o grupo inteiro errado quando um
 * único depósito negativo aparecia primeiro na lista.
 */
export function agruparPorTipo(transacoes: Transaction[]): TotalPorTipo[] {
  const liquidoPorTipo = new Map<TransactionType, number>();

  for (const tx of transacoes) {
    if (tx.amount === 0) continue;
    liquidoPorTipo.set(tx.type, (liquidoPorTipo.get(tx.type) ?? 0) + tx.amount);
  }

  return Array.from(liquidoPorTipo.entries())
    .filter(([, liquido]) => liquido !== 0)
    .map(([type, liquido]) => ({
      type,
      total: Math.abs(liquido),
      direcao: liquido > 0 ? ('entrada' as const) : ('saida' as const),
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Evolução do saldo ao longo do tempo.
 *
 * Reconstrói a curva a partir do saldo atual, andando para trás: o saldo de
 * hoje é conhecido e exato, enquanto um "saldo inicial" seria suposição.
 */
export function evolucaoDoSaldo(transacoes: Transaction[], saldoAtual: number): PontoDeSaldo[] {
  const cronologico = [...transacoes].sort((a, b) => a.date.getTime() - b.date.getTime());
  const soma = cronologico.reduce((acc, tx) => acc + tx.amount, 0);

  let corrente = saldoAtual - soma;
  return cronologico.map((tx) => {
    corrente += tx.amount;
    return { data: tx.date, saldo: corrente };
  });
}
