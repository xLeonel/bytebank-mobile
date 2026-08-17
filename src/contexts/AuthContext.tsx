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

  /**
   * Rede de segurança contra tela travada.
   *
   * `onAuthStateChanged` normalmente dispara em milissegundos, inclusive com
   * `null` quando não há sessão. Mas se o SDK não conseguir inicializar — sem
   * rede, configuração errada, persistência indisponível — ele simplesmente
   * nunca chama o callback, e a tela de loading fica girando para sempre sem
   * dizer nada. Depois de 10s assumimos "sem sessão" e seguimos para o login,
   * que ao menos é uma tela onde o usuário pode agir.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading((aindaCarregando) => {
        if (aindaCarregando) {
          console.warn(
            '[auth] onAuthStateChanged não respondeu em 10s. ' +
              'Verifique conexão e a configuração do Firebase em .env.local.',
          );
        }
        return false;
      });
    }, 10_000);
    return () => clearTimeout(timer);
  }, []);

  // Fonte da verdade da sessão. Com a persistência em AsyncStorage configurada
  // em lib/firebase, este listener dispara já com o usuário restaurado após o
  // app ser reaberto.
  useEffect(() => {
    return onAuthStateChanged(auth, async (usuarioAtual) => {
      console.log('[auth] estado resolvido:', usuarioAtual ? 'autenticado' : 'sem sessão');
      setUser(usuarioAtual);
      if (usuarioAtual) {
        try {
          const snap = await getDoc(doc(db, 'users', usuarioAtual.uid));
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            // Conta de Auth sem documento de perfil. Acontece com contas
            // criadas antes de o perfil passar a ser gravado, ou se o setDoc
            // do cadastro falhou. Cria o perfil faltante em vez de deixar o
            // card permanentemente sem agência/conta.
            console.warn('[auth] perfil ausente para', usuarioAtual.uid, '- criando');
            const recuperado: UserProfile = {
              name: usuarioAtual.displayName ?? '',
              email: usuarioAtual.email ?? '',
              ...gerarDadosDaConta(),
            };
            await setDoc(doc(db, 'users', usuarioAtual.uid), recuperado);
            setProfile(recuperado);
          }
        } catch (e) {
          // Perfil é complementar: sem ele o app funciona, só não mostra
          // agência/conta. Mas engolir o erro em silêncio deixava impossível
          // distinguir "documento não existe" de "regra negou a leitura".
          console.warn('[auth] falha ao carregar o perfil:', (e as Error)?.message);
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
    // Só esta parte pode derrubar o cadastro: sem conta de Auth não há sessão.
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: nome.trim() });

    const novoPerfil: UserProfile = {
      name: nome.trim(),
      email: email.trim(),
      ...gerarDadosDaConta(),
    };

    /**
     * A gravação do perfil é tratada à parte, e de propósito.
     *
     * `onAuthStateChanged` dispara assim que a conta de Auth existe, e o guard
     * já navega para a home — antes deste `setDoc` terminar. Se a falha dele
     * subisse como erro do cadastro, a mensagem apareceria numa tela que o
     * usuário acabou de deixar: foi assim que uma negação das regras de
     * segurança passou despercebida, dando a impressão de cadastro bem-sucedido.
     *
     * Aqui o perfil é complementar: a sessão vale mesmo sem ele, e o
     * `onAuthStateChanged` recria o documento na próxima carga se estiver
     * faltando. O que não pode é a falha ser silenciosa.
     */
    try {
      await setDoc(doc(db, 'users', cred.user.uid), novoPerfil);
      setProfile(novoPerfil);
    } catch (e) {
      console.warn(
        '[auth] conta criada, mas o perfil nao foi gravado:',
        (e as Error)?.message,
        '- sera recriado na proxima carga',
      );
    }
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
