/** Perfil do usuário, em users/{uid}. */
export type UserProfile = {
  name: string;
  email: string;
  agency: string;
  bankAccount: string;
  /** Download URL da foto no Storage; ausente quando não há foto. */
  photoUrl?: string;
};

/** Agência fixa e conta gerada — quem define o número da conta é o banco. */
export function gerarDadosDaConta(): Pick<UserProfile, 'agency' | 'bankAccount'> {
  const numero = String(Math.floor(10000 + Math.random() * 90000));
  const digito = Math.floor(Math.random() * 10);
  return { agency: '0001', bankAccount: `${numero}-${digito}` };
}
