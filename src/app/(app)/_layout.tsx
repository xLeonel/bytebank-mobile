import { Stack } from 'expo-router';

import { TransactionsProvider } from '@/modules/transactions/presentation/TransactionsContext';

/**
 * Layout da área logada: as abas e, por cima delas, as telas de detalhe.
 *
 * O TransactionsProvider vive aqui, e não na raiz, porque a assinatura do
 * Firestore depende de um usuário autenticado. Montá-lo acima do guard faria a
 * consulta disparar antes da sessão existir, resultando em permission-denied.
 */
export default function AppLayout() {
  return (
    <TransactionsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </TransactionsProvider>
  );
}
