import type { ValidationResult } from '@/shared/domain/validation';

const TAMANHO_MINIMO = 8;

/** Vale para contas novas: o login de quem já tem conta não passa por aqui. */
export function validarSenhaNova(senha: string): ValidationResult {
  if (senha.length < TAMANHO_MINIMO || !/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) {
    return {
      valid: false,
      message: `A senha precisa ter ao menos ${TAMANHO_MINIMO} caracteres, com letras e números.`,
    };
  }
  return { valid: true };
}
