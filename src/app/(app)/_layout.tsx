import { Stack } from 'expo-router';

import { TransactionsProvider } from '@/contexts/TransactionsContext';

/**
 * Layout da área logada.
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
