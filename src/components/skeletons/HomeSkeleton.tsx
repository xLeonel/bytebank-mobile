import { StyleSheet, View } from 'react-native';

import { Shimmer } from '@/components/Shimmer';
import { Colors, Radius, Spacing } from '@/constants/theme';

/**
 * Esqueleto da home.
 *
 * Reproduz a geometria da tela real — mesmas alturas e espaçamentos — para o
 * conteúdo não "pular" quando os dados chegam. Um spinner centralizado seria
 * mais simples, mas troca uma tela vazia por outra: o esqueleto já comunica o
 * que vai aparecer e onde.
 */
export function HomeSkeleton() {
  return (
    <View style={styles.conteudo}>
      <View style={styles.cardSaldo}>
        <Shimmer claro width="55%" height={26} />
        <Shimmer claro width="40%" height={14} style={styles.espaco} />

        <View style={styles.conta}>
          <Shimmer claro width="35%" height={12} />
          <Shimmer claro width="28%" height={11} style={styles.espacoPequeno} />
          <Shimmer claro width="32%" height={11} style={styles.espacoPequeno} />
        </View>

        <Shimmer claro width="60%" height={34} style={styles.espacoGrande} />
      </View>

      <View style={styles.card}>
        <Shimmer width="45%" height={18} />
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.linha}>
            <View style={styles.linhaTexto}>
              <Shimmer width="55%" height={14} />
              <Shimmer width="35%" height={12} style={styles.espacoPequeno} />
            </View>
            <Shimmer width={78} height={16} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: Spacing.md, gap: Spacing.md },
  cardSaldo: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  conta: { marginTop: Spacing.md },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  linhaTexto: { flex: 1, marginRight: Spacing.md },
  espaco: { marginTop: Spacing.sm },
  espacoPequeno: { marginTop: Spacing.xs },
  espacoGrande: { marginTop: Spacing.lg },
});
