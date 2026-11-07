import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from '@firebase/auth';

import type { AuthGateway } from '@/modules/auth/application/ports';
import {
  mensagemDeErroAuth,
  type CodigoErroAuth,
  type SessionUser,
} from '@/modules/auth/domain/session';
import { auth } from '@/shared/infrastructure/firebase';

const CODIGOS: Record<string, CodigoErroAuth> = {
  'auth/invalid-email': 'email-invalido',
  'auth/invalid-credential': 'credenciais-invalidas',
  'auth/user-not-found': 'credenciais-invalidas',
  'auth/wrong-password': 'credenciais-invalidas',
  'auth/email-already-in-use': 'email-em-uso',
  'auth/weak-password': 'senha-fraca',
  'auth/too-many-requests': 'muitas-tentativas',
  'auth/network-request-failed': 'sem-conexao',
};

function traduzirErro(e: unknown): Error {
  const codigo = CODIGOS[(e as { code?: string })?.code ?? ''] ?? 'desconhecido';
  return new Error(mensagemDeErroAuth(codigo));
}

function paraSessao({ uid, email, displayName }: User): SessionUser {
  return { uid, email, displayName };
}

export const firebaseAuthGateway: AuthGateway = {
  observarSessao(aoMudar) {
    return onAuthStateChanged(auth, (usuario) => aoMudar(usuario && paraSessao(usuario)));
  },

  async entrar(email, senha) {
    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch (e) {
      throw traduzirErro(e);
    }
  },

  async criarConta(nome, email, senha) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      await updateProfile(cred.user, { displayName: nome });
      return paraSessao(cred.user);
    } catch (e) {
      throw traduzirErro(e);
    }
  },

  async sair() {
    await signOut(auth);
  },
};
