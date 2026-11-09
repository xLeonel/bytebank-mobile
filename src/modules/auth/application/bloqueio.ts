import { createStore } from 'zustand/vanilla';

import type { AutenticadorLocal } from './ports';

export type EstadoDoBloqueio = {
  /** Exige biometria ou senha do aparelho para continuar. */
  bloqueado: boolean;
  /** Cobre a tela enquanto o app não está em foco, para o saldo não vazar no alternador. */
  oculto: boolean;
};

/** Sair do app por pouco tempo, como para fotografar um recibo, não bloqueia. */
const TOLERANCIA_EM_SEGUNDO_PLANO = 30_000;

/**
 * Bloqueio local da sessão.
 *
 * Bloqueia ao abrir com sessão restaurada e ao voltar de um tempo em segundo plano;
 * um login recém-feito já provou quem é o usuário. A tela de cima é só uma camada:
 * o que está por baixo continua montado, então desbloquear não perde um formulário
 * preenchido.
 */
export function criarBloqueio(
  autenticador: AutenticadorLocal,
  tolerancia = TOLERANCIA_EM_SEGUNDO_PLANO,
) {
  const store = createStore<EstadoDoBloqueio>(() => ({ bloqueado: false, oculto: false }));
  let sessaoAtiva = false;
  let foiParaSegundoPlanoEm: number | null = null;
  let autenticando = false;

  async function bloquearSePossivel() {
    if (await autenticador.disponivel()) store.setState({ bloqueado: true });
  }

  return {
    store,

    aoEntrar() {
      sessaoAtiva = true;
    },

    async aoRestaurarSessao() {
      sessaoAtiva = true;
      await bloquearSePossivel();
    },

    aoSair() {
      sessaoAtiva = false;
      foiParaSegundoPlanoEm = null;
      store.setState({ bloqueado: false, oculto: false });
    },

    /**
     * Só cobre a tela: no iOS o próprio pedido de Face ID deixa o app inativo, e
     * contar isso como segundo plano bloquearia de novo a cada desbloqueio.
     */
    aoPerderFoco() {
      if (sessaoAtiva) store.setState({ oculto: true });
    },

    aoIrParaSegundoPlano(agora: number) {
      if (!sessaoAtiva) return;
      foiParaSegundoPlanoEm = agora;
      store.setState({ oculto: true });
    },

    async aoVoltar(agora: number) {
      const tempoFora = foiParaSegundoPlanoEm === null ? 0 : agora - foiParaSegundoPlanoEm;
      foiParaSegundoPlanoEm = null;
      if (sessaoAtiva && tempoFora >= tolerancia) await bloquearSePossivel();
      store.setState({ oculto: false });
    },

    async desbloquear() {
      if (autenticando || !store.getState().bloqueado) return;
      autenticando = true;
      try {
        if (await autenticador.autenticar('Desbloquear o Bytebank')) {
          store.setState({ bloqueado: false });
        }
      } finally {
        autenticando = false;
      }
    },
  };
}
