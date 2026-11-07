/** Usuário da sessão, sem dependência do tipo `User` do provedor de autenticação. */
export type SessionUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

export type CodigoErroAuth =
  | 'email-invalido'
  | 'credenciais-invalidas'
  | 'email-em-uso'
  | 'senha-fraca'
  | 'muitas-tentativas'
  | 'sem-conexao'
  | 'desconhecido';

const MENSAGENS: Record<CodigoErroAuth, string> = {
  'email-invalido': 'E-mail inválido.',
  'credenciais-invalidas': 'E-mail ou senha incorretos.',
  'email-em-uso': 'Este e-mail já está cadastrado.',
  'senha-fraca': 'A senha precisa ter ao menos 6 caracteres.',
  'muitas-tentativas': 'Muitas tentativas. Tente novamente em alguns minutos.',
  'sem-conexao': 'Sem conexão. Verifique sua internet.',
  desconhecido: 'Não foi possível concluir. Tente novamente.',
};

/** Mensagem que o usuário entende para cada falha de autenticação. */
export function mensagemDeErroAuth(codigo: CodigoErroAuth): string {
  return MENSAGENS[codigo];
}
