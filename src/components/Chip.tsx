import { Pressable, StyleSheet, Text, View } from 'react-native';

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

/**
 * Grade de chips que quebra linha — nunca rola.
 *
 * A versão anterior era uma faixa com rolagem horizontal, e isso é ruim em
 * duas frentes: o usuário não vê quais opções existem sem arrastar às cegas, e
 * o gesto horizontal compete com a rolagem vertical da tela. Com poucas opções
 * curtas, mostrar todas de uma vez custa uma ou duas linhas e elimina o
 * problema.
 *
 * Para conjuntos longos (as 11 categorias), use `Select` — em grade elas
 * tomariam quatro linhas e empurrariam o conteúdo da tela para baixo.
 */
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
    <View style={styles.grupo}>
      <Chip label={rotuloTodos} ativo={selecionado === null} onPress={() => onSelecionar(null)} />
      {opcoes.map((opcao) => (
        <Chip
          key={opcao}
          label={rotulo(opcao)}
          ativo={selecionado === opcao}
          onPress={() => onSelecionar(selecionado === opcao ? null : opcao)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  chip: {
    minHeight: 40, // alvo de toque confortável
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
  },
  ativo: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pressionado: { opacity: 0.7 },
  texto: { fontSize: FontSize.xs, color: Colors.textSecondary },
  textoAtivo: { color: Colors.onPrimary, fontWeight: '600' },
});
