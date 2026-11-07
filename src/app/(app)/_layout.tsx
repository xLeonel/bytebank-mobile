import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/shared/ui/theme';
import { TransactionsProvider } from '@/modules/transactions/presentation/TransactionsContext';

// A altura padrão da barra (49) corta os rótulos abaixo dos ícones.
const ALTURA_DA_BARRA = 60;

/**
 * Layout da área logada — abas fixas na base.
 *
 * O TransactionsProvider vive aqui, e não na raiz, porque a assinatura do
 * Firestore depende de um usuário autenticado. Montá-lo acima do guard faria a
 * consulta disparar antes da sessão existir, resultando em permission-denied.
 */
export default function AppLayout() {
  const insets = useSafeAreaInsets();

  return (
    <TransactionsProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: [styles.barra, { height: ALTURA_DA_BARRA + insets.bottom }],
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
        {/* Rota de detalhe: precisa existir no navegador para ser acessível,
            mas não é um destino de nível superior — href null a esconde da barra. */}
        <Tabs.Screen name="transacao/[id]" options={{ href: null }} />
      </Tabs>
    </TransactionsProvider>
  );
}

const styles = StyleSheet.create({
  barra: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.borderLight,
  },
  // "Nova transação" é o rótulo mais longo; sem folga ele quebra em duas linhas
  // e desalinha a altura das abas.
  rotulo: { fontSize: 11, fontWeight: '600' },
  item: { paddingHorizontal: 2 },
});
