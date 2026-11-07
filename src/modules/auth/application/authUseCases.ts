import type { AuthGateway } from './ports';

export function criarCasosDeUsoDeAutenticacao(gateway: AuthGateway) {
  return {
    observarSessao: gateway.observarSessao,
    sair: gateway.sair,

    entrar(email: string, senha: string) {
      return gateway.entrar(email.trim(), senha);
    },

    cadastrar(nome: string, email: string, senha: string) {
      return gateway.criarConta(nome.trim(), email.trim(), senha);
    },
  };
}
