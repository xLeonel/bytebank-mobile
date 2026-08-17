/**
 * Formatação pt-BR feita à mão, sem `Intl`.
 *
 * O suporte a `Intl` no Hermes depende de como o binário foi compilado e varia
 * entre plataformas — e uma falha só apareceria em runtime, no dispositivo. Os
 * formatos aqui são fixos e simples, então implementá-los diretamente sai mais
 * barato que carregar locale data e mais seguro que depender do ambiente.
 */

const MESES_CURTOS = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const DIAS_SEMANA = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];

/** 1234.5 -> "R$ 1.234,50" · -99 -> "-R$ 99,00" */
export function formatBrl(valor: number): string {
  const negativo = valor < 0;
  const centavos = Math.round(Math.abs(valor) * 100);
  const inteiros = Math.floor(centavos / 100);
  const resto = centavos % 100;

  const comMilhar = String(inteiros).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}R$ ${comMilhar},${String(resto).padStart(2, '0')}`;
}

/** Máscara de digitação: "12345" -> "123,45" (usada no input de valor). */
export function maskAmount(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const centavos = parseInt(digits, 10);
  const inteiros = Math.floor(centavos / 100);
  const resto = centavos % 100;
  const comMilhar = String(inteiros).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${comMilhar},${String(resto).padStart(2, '0')}`;
}

/** Máscara -> número. "1.234,50" -> 1234.5 */
export function parseAmount(masked: string): number {
  const digits = masked.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) / 100 : 0;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** Date -> "15/08/2026" */
export function formatDate(date: Date): string {
  return `${doisDigitos(date.getDate())}/${doisDigitos(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Date -> "15 de agosto de 2026" */
export function formatDateLong(date: Date): string {
  return `${date.getDate()} de ${MESES[date.getMonth()]} de ${date.getFullYear()}`;
}

/** Date -> "Sábado, 15/08/2026" */
export function formatTodayGreeting(date: Date = new Date()): string {
  return `${DIAS_SEMANA[date.getDay()]}, ${formatDate(date)}`;
}

/** Date -> "ago/26" (rótulo de eixo de gráfico) */
export function formatMonthShort(date: Date): string {
  return `${MESES_CURTOS[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`;
}

/** Chave de agrupamento cronológico: "2026-08" */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${doisDigitos(date.getMonth() + 1)}`;
}
