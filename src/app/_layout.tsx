import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '@/shared/ui/theme';
import { AuthProvider, useAuth } from '@/modules/auth/presentation/AuthContext';
import { BloqueioDoApp } from '@/modules/auth/presentation/BloqueioDoApp';
import { AvisoNaTela } from '@/shared/ui/Aviso';

/**
 * Guarda de rota.
 *
 * Diferente da Fase 2 — onde o guard só checava se *existia* uma sessão e o
 * usuário com token vencido entrava numa tela que falhava inteira —, aqui a
 * fonte é o `onAuthStateChanged` do Firebase, que já reflete token expirado ou
 * revogado. Enquanto `loading`, não se redireciona: navegar antes de o estado
 * resolver mandaria todo mundo para o login no boot.
 */
function RotasProtegidas() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Cada estado tem uma área onde pode ficar; qualquer outro lugar é
    // redirecionado. Antes a condição era "está na área pública?", o que
    // deixava de fora a raiz: um usuário com sessão restaurada abrindo o app
    // em "/" não casava com nenhum ramo e ficava preso no spinner do index.
    // Perguntar "está na área certa?" cobre a raiz e qualquer rota perdida.
    const emAreaPublica = segments[0] === '(auth)';
    const emAreaLogada = segments[0] === '(app)';

    if (!user && !emAreaPublica) {
      router.replace('/(auth)/login');
    } else if (user && !emAreaLogada) {
      router.replace('/(app)/(tabs)/home');
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RotasProtegidas />
      <AvisoNaTela />
      <BloqueioDoApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  carregando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
