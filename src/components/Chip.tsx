import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

type ChipProps = {
  label: string;
  ativo: boolean;
  onPress: () => void;
};

export function Chip({ label, ativo, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // `selected` faz o leitor de tela anunciar o estado; sem isso a única
      // pista de que o filtro está ativo seria a cor.
      accessibilityState={{ selected: ativo }}
      style={({ pressed }) => [styles.chip, ativo && styles.ativo, pressed && styles.pressionado]}
    >
      <Text style={[styles.texto, ativo && styles.textoAtivo]}>{label}</Text>
    </Pressable>
  );
}

/** Faixa horizontal rolável de chips — usada nos filtros do extrato. */
export function ChipGroup<T extends string>({
  opcoes,
  selecionado,
  onSelecionar,
  rotuloTodos = 'Todos',
  // O rótulo exibido pode diferir do valor: o filtro de tipo guarda 'pix' e
  // mostra "Transferência Pix".
  rotulo = (valor: T) => valor,
}: {
  opcoes: readonly T[];
  selecionado: T | null;
  onSelecionar: (valor: T | null) => void;
  rotuloTodos?: string;
  rotulo?: (valor: T) => string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.grupo}
      keyboardShouldPersistTaps="handled"
    >
      <Chip label={rotuloTodos} ativo={selecionado === null} onPress={() => onSelecionar(null)} />
      {opcoes.map((opcao) => (
        <Chip
          key={opcao}
          label={rotulo(opcao)}
          ativo={selecionado === opcao}
          onPress={() => onSelecionar(selecionado === opcao ? null : opcao)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  ativo: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pressionado: { opacity: 0.7 },
  texto: { fontSize: FontSize.xs, color: Colors.textSecondary },
  textoAtivo: { color: Colors.onPrimary, fontWeight: '600' },
});
