import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';

import { Colors, FontSize, Spacing } from '@/constants/theme';
import type { TotaisDoMes } from '@/domain/analytics';
import { formatBrl } from '@/domain/format';

type Props = { dados: TotaisDoMes[]; largura: number };

const ALTURA = 190;
const ESPACO_ROTULO = 22;

/**
 * Entradas x saídas por mês, barras agrupadas.
 *
 * Duas séries que são a mesma grandeza em direções opostas — por isso duas
 * cores com legenda, e não um degradê. As barras não têm rótulo de valor: com
 * 6 meses x 2 barras seriam 12 números competindo entre si; o eixo e o toque
 * dão o detalhe quando ele importa.
 */
export function EntradasSaidasChart({ dados, largura }: Props) {
  if (dados.length === 0) return <Vazio />;

  const alturaPlot = ALTURA - ESPACO_ROTULO;
  const maximo = Math.max(...dados.flatMap((d) => [d.entradas, d.saidas]), 1);

  const larguraGrupo = largura / dados.length;
  const larguraBarra = Math.min(14, larguraGrupo / 3);
  const vao = 4;

  return (
    <View>
      <Svg width={largura} height={ALTURA}>
        {dados.map((mes, i) => {
          const centro = i * larguraGrupo + larguraGrupo / 2;
          const hEntrada = (mes.entradas / maximo) * (alturaPlot - 8);
          const hSaida = (mes.saidas / maximo) * (alturaPlot - 8);

          return (
            <G key={mes.chave}>
              <Rect
                x={centro - larguraBarra - vao / 2}
                y={alturaPlot - hEntrada}
                width={larguraBarra}
                height={hEntrada}
                rx={3}
                fill={Colors.primary}
              />
              <Rect
                x={centro + vao / 2}
                y={alturaPlot - hSaida}
                width={larguraBarra}
                height={hSaida}
                rx={3}
                fill={Colors.warning}
              />
            </G>
          );
        })}
      </Svg>

      {/* Rótulos em Text nativo, não em <SvgText>: acompanham a fonte do
          sistema e o ajuste de tamanho de fonte da acessibilidade. */}
      <View style={[styles.eixo, { width: largura }]}>
        {dados.map((mes) => (
          <Text key={mes.chave} style={[styles.rotuloEixo, { width: largura / dados.length }]}>
            {mes.rotulo}
          </Text>
        ))}
      </View>

      <View style={styles.legenda}>
        <ItemLegenda cor={Colors.primary} texto="Entradas" />
        <ItemLegenda cor={Colors.warning} texto="Saídas" />
      </View>

      <View style={styles.resumo}>
        <Text style={styles.resumoTexto}>
          Maior movimento do período: {formatBrl(maximo)}
        </Text>
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

function Vazio() {
  return <Text style={styles.vazio}>Sem dados suficientes para este gráfico.</Text>;
}

const styles = StyleSheet.create({
  eixo: { flexDirection: 'row', marginTop: -ESPACO_ROTULO + 4 },
  rotuloEixo: { textAlign: 'center', fontSize: 10, color: Colors.textMuted },
  legenda: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  marcador: { width: 10, height: 10, borderRadius: 2 },
  textoLegenda: { fontSize: FontSize.xs, color: Colors.textSecondary },
  resumo: { marginTop: Spacing.sm, alignItems: 'center' },
  resumoTexto: { fontSize: FontSize.xs, color: Colors.textMuted },
  vazio: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.xl },
});
