import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

type Props = TextInputProps & {
  label: string;
  /** Mensagem de erro; quando presente, colore a borda e é lida por leitores de tela. */
  error?: string;
};

export function Input({ label, error, style, ...rest }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !!error && styles.inputComErro, style]}
        placeholderTextColor={Colors.textMuted}
        accessibilityLabel={label}
        // Sem isto, o leitor de tela anuncia o campo sem dizer o que está errado.
        accessibilityHint={error}
        {...rest}
      />
      {!!error && (
        <Text style={styles.erro} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  inputComErro: { borderColor: Colors.error },
  erro: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    color: Colors.error,
  },
});
