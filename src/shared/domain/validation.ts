export type ValidationResult = { valid: boolean; message?: string };

/** Campo obrigatório não pode ser vazio. */
export function validateRequired(
  value: string | undefined | null,
  label = 'Campo',
): ValidationResult {
  if (!value || !value.trim()) return { valid: false, message: `${label} é obrigatório.` };
  return { valid: true };
}
