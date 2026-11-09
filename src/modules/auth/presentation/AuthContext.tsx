import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { casosDeAutenticacao, casosDeBloqueio, casosDePerfil } from '@/composition/container';
import type { SessionUser } from '@/modules/auth/domain/session';
import type { UserProfile } from '@/modules/profile/domain/profile';
import { marcarPerf } from '@/shared/ui/marcarPerf';

type AuthContextValue = {
  user: SessionUser | null;
  profile: UserProfile | null;
  /** true enquanto o estado inicial de autenticação ainda não foi resolvido. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (nome: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Grava alterações parciais no perfil e reflete no estado local. */
  atualizarPerfil: (dados: Partial<UserProfile>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const cadastrando = useRef(false);

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
  // em shared/infrastructure/firebase, este listener dispara já com o usuário
  // restaurado após o app ser reaberto.
  useEffect(() => {
    let primeiroEstado = true;
    let uidAtual: string | null = null;

    return casosDeAutenticacao.observarSessao(async (usuarioAtual) => {
      console.log('[auth] estado resolvido:', usuarioAtual ? 'autenticado' : 'sem sessão');
      marcarPerf('sessao resolvida');

      // Com usuário já no primeiro estado, a sessão foi restaurada ao abrir o app;
      // depois disso, é um login que acabou de provar quem é o usuário.
      if (!usuarioAtual) casosDeBloqueio.aoSair();
      else if (primeiroEstado) await casosDeBloqueio.aoRestaurarSessao();
      else casosDeBloqueio.aoEntrar();
      primeiroEstado = false;

      uidAtual = usuarioAtual?.uid ?? null;
      setUser(usuarioAtual);
      if (!usuarioAtual) setProfile(null);

      // Libera a tela sem esperar o perfil: ele só completa o card com nome e
      // conta, e esperá-lo deixava a abertura presa a uma ida ao servidor.
      setLoading(false);

      // A conta de Auth nasce antes do documento de perfil: buscar aqui acharia o
      // perfil "faltando" e criaria outro, com outro número de conta, competindo
      // com o que o cadastro está gravando.
      if (!usuarioAtual || cadastrando.current) return;

      try {
        const perfil = await casosDePerfil.carregarOuRecuperar(usuarioAtual);
        // A sessão pode ter mudado enquanto o perfil chegava.
        if (uidAtual !== usuarioAtual.uid) return;
        setProfile(perfil);
        marcarPerf('perfil carregado');
      } catch (e) {
        // Perfil é complementar: sem ele o app funciona, só não mostra
        // agência/conta. Mas engolir o erro em silêncio deixava impossível
        // distinguir "documento não existe" de "regra negou a leitura".
        console.warn('[auth] falha ao carregar o perfil:', (e as Error)?.message);
        if (uidAtual === usuarioAtual.uid) setProfile(null);
      }
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await casosDeAutenticacao.entrar(email, password);
  }, []);

  const signUp = useCallback(async (nome: string, email: string, password: string) => {
    cadastrando.current = true;
    let usuario: SessionUser;
    try {
      // Só esta parte pode derrubar o cadastro: sem conta de Auth não há sessão.
      usuario = await casosDeAutenticacao.cadastrar(nome, email, password);
    } catch (e) {
      cadastrando.current = false;
      throw e;
    }
    // O nome é gravado depois de a conta existir, então a sessão publicada pelo
    // observador ainda não o tem.
    setUser(usuario);

    /**
     * A gravação do perfil é tratada à parte, e de propósito.
     *
     * `onAuthStateChanged` dispara assim que a conta de Auth existe, e o guard
     * já navega para a home — antes deste cadastro terminar. Se a falha subisse
     * como erro do cadastro, a mensagem apareceria numa tela que o usuário
     * acabou de deixar: foi assim que uma negação das regras de segurança passou
     * despercebida, dando a impressão de cadastro bem-sucedido.
     *
     * Aqui o perfil é complementar: a sessão vale mesmo sem ele, e o observador
     * recria o documento na próxima carga se estiver faltando. O que não pode é
     * a falha ser silenciosa.
     */
    try {
      setProfile(await casosDePerfil.criarInicial(usuario.uid, nome, email));
    } catch (e) {
      console.warn(
        '[auth] conta criada, mas o perfil nao foi gravado:',
        (e as Error)?.message,
        '- sera recriado na proxima carga',
      );
    } finally {
      cadastrando.current = false;
    }
  }, []);

  const signOut = useCallback(() => casosDeAutenticacao.sair(), []);

  const atualizarPerfil = useCallback(
    async (dados: Partial<UserProfile>) => {
      if (!user) throw new Error('Sessão expirada. Entre novamente.');
      await casosDePerfil.atualizar(user.uid, dados);
      setProfile((atual) => (atual ? { ...atual, ...dados } : atual));
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, profile, loading, signIn, signUp, signOut, atualizarPerfil }),
    [user, profile, loading, signIn, signUp, signOut, atualizarPerfil],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}
