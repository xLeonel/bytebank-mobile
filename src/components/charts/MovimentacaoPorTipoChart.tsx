import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { TotalPorTipo } from '@/domain/analytics';
import { formatBrl } from '@/domain/format';
import { TYPE_LABEL } from '@/domain/transaction';

type Props = { dados: TotalPorTipo[] };

/**
 * Volume líquido por tipo, em barras horizontais ordenadas.
 *
 * Barra e não pizza: com crédito e débito lado a lado, a pizza afirmaria uma
 * relação parte-de-um-todo que não existe — não faz sentido dizer que o
 * depósito é "x% do total" quando ele anda no sentido oposto.
 *
 * Feito com View em vez de SVG: são retângulos com canto arredondado e largura
 * proporcional, exatamente o que o layout do RN já faz. SVG aqui só adicionaria
 * indireção, e o texto ficaria fora do fluxo de acessibilidade.
 */
export function MovimentacaoPorTipoChart({ dados }: Props) {
  if (dados.length === 0) {
    return <Text style={styles.vazio}>Sem dados suficientes para este gráfico.</Text>;
  }

  const maximo = Math.max(...dados.map((d) => d.total), 1);

  return (
    <View>
      {dados.map((item) => {
        const proporcao = item.total / maximo;
        const entrada = item.direcao === 'entrada';

        return (
          <View
            key={item.type}
            style={styles.linha}
            accessible
            accessibilityLabel={`${TYPE_LABEL[item.type]}, ${entrada ? 'entrada' : 'saída'} de ${formatBrl(item.total)}`}
          >
            <Text style={styles.rotulo} numberOfLines={1}>
              {TYPE_LABEL[item.type]}
            </Text>

            <View style={styles.trilha}>
              <View
                style={[
                  styles.barra,
                  {
                    // Mínimo de 4% para um valor pequeno continuar visível em
                    // vez de virar uma barra de largura zero.
                    width: `${Math.max(4, proporcao * 100)}%`,
                    backgroundColor: entrada ? Colors.primary : Colors.warning,
                  },
                ]}
              />
            </View>

            <Text style={styles.valor}>{formatBrl(item.total)}</Text>
          </View>
        );
      })}

      <View style={styles.legenda}>
        <ItemLegenda cor={Colors.primary} texto="Entrada" />
        <ItemLegenda cor={Colors.warning} texto="Saída" />
      </View>
    </View>
  );
}

function ItemLegenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <View style={styles.itemLegenda}>
      <View style={[styles.marcador, { backgroundColor: cor }]} />
      <Text style={styles.textoLegenda}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { marginBottom: Spacing.md },
  rotulo: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: Spacing.xs },
  trilha: {
    height: 18,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  barra: { height: '100%', borderRadius: Radius.sm },
  valor: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text,
  },
  legenda: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  marcador: { width: 10, height: 10, borderRadius: 2 },
  textoLegenda: { fontSize: FontSize.xs, color: Colors.textSecondary },
  vazio: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
});
