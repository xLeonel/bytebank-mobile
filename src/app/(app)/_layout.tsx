import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Colors, FontSize, Spacing } from '@/constants/theme';
import { TransactionsProvider } from '@/contexts/TransactionsContext';

/**
 * Layout da área logada — abas fixas na base.
 *
 * O TransactionsProvider vive aqui, e não na raiz, porque a assinatura do
 * Firestore depende de um usuário autenticado. Montá-lo acima do guard faria a
 * consulta disparar antes da sessão existir, resultando em permission-denied.
 */
export default function AppLayout() {
  return (
    <TransactionsProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: styles.barra,
          tabBarLabelStyle: styles.rotulo,
          tabBarItemStyle: styles.item,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Início',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="nova-transacao"
          options={{
            title: 'Nova transação',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="add-circle" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="extrato"
          options={{
            title: 'Extrato',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="configuracoes"
          options={{
            title: 'Ajustes',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </TransactionsProvider>
  );
}

const styles = StyleSheet.create({
  barra: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.xs,
  },
  // "Nova transação" é o rótulo mais longo; sem folga ele quebra em duas linhas
  // e desalinha a altura das abas.
  rotulo: { fontSize: 11, fontWeight: '600' },
  item: { paddingHorizontal: 2 },
});
