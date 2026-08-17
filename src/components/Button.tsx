import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: Props) {
  const bloqueado = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={bloqueado}
      accessibilityRole="button"
      accessibilityState={{ disabled: bloqueado, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        bloqueado && styles.bloqueado,
        pressed && !bloqueado && styles.pressionado,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.onPrimary : Colors.primary} />
      ) : (
        <Text style={[styles.texto, variant !== 'primary' && styles.textoEscuro]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48, // alvo de toque confortável
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.warning },
  ghost: { backgroundColor: 'transparent' },
  bloqueado: { opacity: 0.5 },
  pressionado: { opacity: 0.85 },
  texto: {
    color: Colors.onPrimary,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  textoEscuro: { color: Colors.primaryDark },
});
