import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Colors, FontSize, Spacing } from '@/constants/theme';
import { TransactionsProvider } from '@/contexts/TransactionsContext';

/**
 * Ícone das abas em texto.
 *
 * @expo/vector-icons não está instalado, e adicioná-lo só por isto traria uma
 * família de fontes inteira ao bundle. Um símbolo curto resolve, e o rótulo
 * abaixo dele já carrega o significado — o ícone aqui é reforço visual, não a
 * única pista.
 */
function IconeAba({ simbolo, cor }: { simbolo: string; cor: string }) {
  return (
    <Text style={[styles.icone, { color: cor }]} accessibilityElementsHidden importantForAccessibility="no">
      {simbolo}
    </Text>
  );
}

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
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: styles.barra,
          tabBarLabelStyle: styles.rotulo,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Início',
            tabBarIcon: ({ color }) => <IconeAba simbolo="●" cor={color} />,
          }}
        />
        <Tabs.Screen
          name="extrato"
          options={{
            title: 'Extrato',
            tabBarIcon: ({ color }) => <IconeAba simbolo="≡" cor={color} />,
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
  rotulo: { fontSize: FontSize.xs, fontWeight: '600' },
  icone: { fontSize: 18, lineHeight: 20 },
});
