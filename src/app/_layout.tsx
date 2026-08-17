import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

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
    const emAreaPublica = segments[0] === '(auth)';

    if (!user && !emAreaPublica) {
      router.replace('/(auth)/login');
    } else if (user && emAreaPublica) {
      router.replace('/(app)/home');
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
