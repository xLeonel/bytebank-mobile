import { isValidCategory } from './category';

export type ValidationResult = { valid: boolean; message?: string };

const OK: ValidationResult = { valid: true };

/** Valor deve ser um número finito e maior que zero. */
export function validateAmount(amount: number): ValidationResult {
  if (!Number.isFinite(amount)) return { valid: false, message: 'Informe um valor válido.' };
  if (amount <= 0) return { valid: false, message: 'O valor deve ser maior que zero.' };
  return OK;
}

/** Campo obrigatório não pode ser vazio. */
export function validateRequired(
  value: string | undefined | null,
  label = 'Campo',
): ValidationResult {
  if (!value || !value.trim()) return { valid: false, message: `${label} é obrigatório.` };
  return OK;
}

/** Data não pode ser futura. Compara só o dia, ignorando horário. */
export function validateDateNotFuture(date: Date): ValidationResult {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return { valid: false, message: 'Data inválida.' };
  }
  const limite = new Date();
  limite.setHours(23, 59, 59, 999);
  if (date.getTime() > limite.getTime()) {
    return { valid: false, message: 'A data não pode ser futura.' };
  }
  return OK;
}

/** Categoria (quando informada) deve ser conhecida. */
export function validateCategory(category: string | undefined): ValidationResult {
  if (!category) return OK; // opcional
  if (!isValidCategory(category)) return { valid: false, message: 'Categoria inválida.' };
  return OK;
}

/** Chave Pix é obrigatória em transferência Pix. */
export function validatePixKey(pixKey: string | undefined): ValidationResult {
  return validateRequired(pixKey, 'Chave Pix');
}

/**
 * Agência e conta do destino, exigidas em depósito "em outra conta".
 * Mesmo formato do Design System da Fase 2: agência com 4+ dígitos, conta com 3+.
 */
export function validateDestino(
  agency: string | undefined,
  account: string | undefined,
): ValidationResult {
  const soDigitos = (v: string | undefined) => (v ?? '').replace(/\D/g, '');
  if (soDigitos(agency).length < 4) {
    return { valid: false, message: 'Informe uma agência válida (4 dígitos).' };
  }
  if (soDigitos(account).length < 3) {
    return { valid: false, message: 'Informe uma conta válida.' };
  }
  return OK;
}
