import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/shared/ui/theme';

// A altura padrão da barra (49) corta os rótulos abaixo dos ícones.
const ALTURA_DA_BARRA = 60;

// A navegação tipa a cor como ColorValue, que o Ionicons não aceita inteiro.
function icone(nome: ComponentProps<typeof Ionicons>['name']) {
  return function IconeDaAba({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={nome} size={size} color={color as string} />;
  };
}

/** Abas fixas na base da área logada. */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
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
      <Tabs.Screen name="home" options={{ title: 'Início', tabBarIcon: icone('home') }} />
      <Tabs.Screen
        name="nova-transacao"
        options={{ title: 'Nova transação', tabBarIcon: icone('add-circle') }}
      />
      <Tabs.Screen name="extrato" options={{ title: 'Extrato', tabBarIcon: icone('receipt-outline') }} />
      <Tabs.Screen
        name="configuracoes"
        options={{ title: 'Ajustes', tabBarIcon: icone('settings-outline') }}
      />
    </Tabs>
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
