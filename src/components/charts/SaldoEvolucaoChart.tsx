import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Colors, FontSize, Spacing } from '@/constants/theme';
import type { PontoDeSaldo } from '@/domain/analytics';
import { formatBrl, formatDate } from '@/domain/format';

type Props = { dados: PontoDeSaldo[]; largura: number };

const ALTURA = 190;
const MARGEM = 8;

/**
 * Evolução do saldo — linha simples, série única.
 *
 * Sem legenda: com uma série só, o título do gráfico já diz o que a linha é;
 * uma caixa de legenda seria ruído. O ponto final é destacado porque é o valor
 * que o usuário reconhece — o saldo de hoje.
 */
export function SaldoEvolucaoChart({ dados, largura }: Props) {
  if (dados.length < 2) {
    return (
      <Text style={styles.vazio}>
        São necessárias ao menos duas transações para desenhar a evolução.
      </Text>
    );
  }

  const valores = dados.map((p) => p.saldo);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const amplitude = maximo - minimo || 1;

  const x = (i: number) => MARGEM + (i / (dados.length - 1)) * (largura - MARGEM * 2);
  const y = (valor: number) =>
    MARGEM + (1 - (valor - minimo) / amplitude) * (ALTURA - MARGEM * 2);

  const caminho = dados.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.saldo)}`).join(' ');

  const ultimo = dados[dados.length - 1];
  // Linha do zero só aparece quando o saldo cruza o eixo; desenhá-la sempre
  // acrescentaria uma referência sem informação quando tudo é positivo.
  const mostrarZero = minimo < 0 && maximo > 0;

  return (
    <View>
      <Svg width={largura} height={ALTURA}>
        {mostrarZero && (
          <Line
            x1={MARGEM}
            y1={y(0)}
            x2={largura - MARGEM}
            y2={y(0)}
            stroke={Colors.border}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}
        <Path d={caminho} stroke={Colors.primary} strokeWidth={2} fill="none" />
        <Circle cx={x(dados.length - 1)} cy={y(ultimo.saldo)} r={4} fill={Colors.warning} />
      </Svg>

      <View style={styles.extremos}>
        <Text style={styles.extremo}>{formatDate(dados[0].data)}</Text>
        <Text style={styles.extremo}>{formatDate(ultimo.data)}</Text>
      </View>

      <View style={styles.resumo}>
        <Text style={styles.resumoRotulo}>Saldo atual</Text>
        <Text style={[styles.resumoValor, ultimo.saldo < 0 && styles.negativo]}>
          {formatBrl(ultimo.saldo)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  extremos: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  extremo: { fontSize: 10, color: Colors.textMuted },
  resumo: { alignItems: 'center', marginTop: Spacing.sm },
  resumoRotulo: { fontSize: FontSize.xs, color: Colors.textSecondary },
  resumoValor: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  negativo: { color: Colors.debito },
  vazio: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
});
