import type { SessionUser } from '@/modules/auth/domain/session';

/**
 * Provedor de autenticação. Toda falha chega como `Error` com a mensagem pronta
 * para exibir (ver domain/session.mensagemDeErroAuth).
 */
export type AuthGateway = {
  /** Assina o estado da sessão; o retorno cancela a assinatura. */
  observarSessao: (aoMudar: (usuario: SessionUser | null) => void) => () => void;
  entrar: (email: string, senha: string) => Promise<void>;
  criarConta: (nome: string, email: string, senha: string) => Promise<SessionUser>;
  sair: () => Promise<void>;
};
