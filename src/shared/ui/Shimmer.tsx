import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius } from '@/shared/ui/theme';

type Props = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** Sobre fundo escuro (card de saldo) o placeholder precisa ser claro. */
  claro?: boolean;
};

/**
 * Bloco de carregamento pulsante.
 *
 * Anima opacidade em vez de varrer um gradiente: `opacity` é aceita pelo
 * `useNativeDriver`, então o loop roda na thread de UI e continua fluido mesmo
 * enquanto o JS está ocupado montando a tela — que é exatamente o momento em
 * que o shimmer aparece. A varredura clássica exigiria expo-linear-gradient e
 * animação de layout, mais pesada justo quando há menos folga.
 */
export function Shimmer({ width = '100%', height = 16, radius = Radius.sm, style, claro }: Props) {
  const opacidade = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulso = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidade, { toValue: 0.75, duration: 700, useNativeDriver: true }),
        Animated.timing(opacidade, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulso.start();
    return () => pulso.stop();
  }, [opacidade]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando"
      style={[
        styles.base,
        claro ? styles.claro : styles.escuro,
        { width, height, borderRadius: radius, opacity: opacidade },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  escuro: { backgroundColor: Colors.border },
  claro: { backgroundColor: 'rgba(255, 255, 255, 0.35)' },
});
