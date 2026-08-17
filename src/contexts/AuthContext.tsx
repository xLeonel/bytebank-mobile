import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from '@firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { UserProfile } from '@/domain/types';
import { auth, db } from '@/lib/firebase';

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  /** true enquanto o estado inicial de autenticação ainda não foi resolvido. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (nome: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Agência fixa e conta gerada — quem define o número da conta é o banco. */
function gerarDadosDaConta(): Pick<UserProfile, 'agency' | 'bankAccount'> {
  const numero = String(Math.floor(10000 + Math.random() * 90000));
  const digito = Math.floor(Math.random() * 10);
  return { agency: '0001', bankAccount: `${numero}-${digito}` };
}

/** Traduz os códigos do Firebase Auth para mensagens que o usuário entende. */
export function traduzirErroAuth(codigo: string): string {
  const mensagens: Record<string, string> = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/weak-password': 'A senha precisa ter ao menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente em alguns minutos.',
    'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
  };
  return mensagens[codigo] ?? 'Não foi possível concluir. Tente novamente.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fonte da verdade da sessão. Com a persistência em AsyncStorage configurada
  // em lib/firebase, este listener dispara já com o usuário restaurado após o
  // app ser reaberto.
  useEffect(() => {
    return onAuthStateChanged(auth, async (usuarioAtual) => {
      setUser(usuarioAtual);
      if (usuarioAtual) {
        try {
          const snap = await getDoc(doc(db, 'users', usuarioAtual.uid));
          setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        } catch {
          // Perfil é complementar: sem ele o app funciona, só não mostra
          // agência/conta no card. Não vale bloquear o login por isso.
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUp = useCallback(async (nome: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: nome.trim() });

    const novoPerfil: UserProfile = {
      name: nome.trim(),
      email: email.trim(),
      ...gerarDadosDaConta(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), novoPerfil);
    setProfile(novoPerfil);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, signIn, signUp, signOut }),
    [user, profile, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}
