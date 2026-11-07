import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/shared/ui/theme';
import { formatBrl, formatDate } from '@/shared/domain/format';
import { TYPE_LABEL } from '@/modules/transactions/domain/transaction';
import type { Transaction } from '@/modules/transactions/domain/types';

type Props = {
  transacao: Transaction;
  onPress?: (transacao: Transaction) => void;
  /** Separador acima da linha; desligue no primeiro item de uma lista. */
  comSeparador?: boolean;
};

export function TransactionRow({ transacao, onPress, comSeparador = true }: Props) {
  const debito = transacao.amount < 0;

  const conteudo = (
    <View style={[styles.linha, comSeparador && styles.comSeparador]}>
      <View style={styles.texto}>
        <View style={styles.cabecalho}>
          {/* Rótulo derivado do valor canônico — o dado guarda 'pix', a tela
              mostra "Transferência Pix". */}
          <Text style={styles.tipo}>{TYPE_LABEL[transacao.type]}</Text>
          {!!transacao.category && (
            <View style={styles.badge}>
              <Text style={styles.badgeTexto}>{transacao.category}</Text>
            </View>
          )}
        </View>
        {!!transacao.description && (
          <Text style={styles.descricao} numberOfLines={1}>
            {transacao.description}
          </Text>
        )}
        <Text style={styles.data}>{formatDate(transacao.date)}</Text>
      </View>

      <Text style={[styles.valor, debito ? styles.debito : styles.credito]}>
        {formatBrl(transacao.amount)}
      </Text>
    </View>
  );

  if (!onPress) return conteudo;

  return (
    <Pressable
      onPress={() => onPress(transacao)}
      accessibilityRole="button"
      accessibilityLabel={`${TYPE_LABEL[transacao.type]}, ${formatBrl(transacao.amount)}, ${formatDate(transacao.date)}`}
      style={({ pressed }) => pressed && styles.pressionado}
    >
      {conteudo}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  comSeparador: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  pressionado: { opacity: 0.6 },
  texto: { flex: 1, marginRight: Spacing.md },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tipo: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  badge: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeTexto: { fontSize: 10, color: Colors.textSecondary },
  descricao: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  data: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  valor: { fontSize: FontSize.md, fontWeight: '700' },
  credito: { color: Colors.credito },
  debito: { color: Colors.debito },
});
