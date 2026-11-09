import { Stack } from 'expo-router';

import { usePreCarregarExtrato } from '@/modules/transactions/presentation/hooks/useExtrato';
import { useSincronizarTransacoes } from '@/modules/transactions/presentation/hooks/useTransacoes';

/** Layout da área logada: as abas e, por cima delas, as telas de detalhe. */
export default function AppLayout() {
  useSincronizarTransacoes();
  usePreCarregarExtrato();

  return <Stack screenOptions={{ headerShown: false }} />;
}
