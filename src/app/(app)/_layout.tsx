import { Stack } from 'expo-router';

import { useSincronizarTransacoes } from '@/modules/transactions/presentation/hooks/useTransacoes';

/** Layout da área logada: as abas e, por cima delas, as telas de detalhe. */
export default function AppLayout() {
  useSincronizarTransacoes();

  return <Stack screenOptions={{ headerShown: false }} />;
}
