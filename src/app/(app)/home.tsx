import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// O SafeAreaView do react-native está deprecado e, no iOS, não respeita o
// notch corretamente. O do safe-area-context lê os insets reais do aparelho.
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { HomeSkeleton } from '@/components/skeletons/HomeSkeleton';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/contexts/TransactionsContext';
import { formatBrl, formatDate, formatTodayGreeting } from '@/domain/format';
import { TYPE_LABEL } from '@/domain/transaction';

const ULTIMAS = 5;

export default function HomeScreen() {
  const { user, profile, signOut } = useAuth();
  const { transacoes, saldo, carregando, erro } = useTransactions();
  const [saldoVisivel, setSaldoVisivel] = useState(true);

  const primeiroNome = (profile?.name ?? user?.displayName ?? '').split(' ')[0] || 'você';

  // Só mostra a home quando há o que mostrar. Renderizar o card com saldo zero
  // enquanto os dados chegam exibiria um valor errado por um instante — pior
  // que assumir o carregamento.
  if (carregando) {
    return (
      <SafeAreaView style={styles.tela} edges={['top']}>
        <HomeSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.cardSaldo}>
          <Text style={styles.saudacao}>Olá, {primeiroNome}! :)</Text>
          <Text style={styles.data}>{formatTodayGreeting()}</Text>

          <View style={styles.conta}>
            <Text style={styles.contaTipo}>Conta Corrente</Text>
            {!!profile && (
              <>
                <Text style={styles.contaLinha}>Agência {profile.agency}</Text>
                <Text style={styles.contaLinha}>Conta {profile.bankAccount}</Text>
              </>
            )}
          </View>

          <Text style={[styles.saldo, saldo < 0 && saldoVisivel && styles.saldoNegativo]}>
            {saldoVisivel ? formatBrl(saldo) : 'R$ •••••'}
          </Text>
          <Pressable
            onPress={() => setSaldoVisivel((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={saldoVisivel ? 'Ocultar saldo' : 'Mostrar saldo'}
            hitSlop={8}
          >
            <Text style={styles.toggle}>{saldoVisivel ? 'Ocultar saldo' : 'Mostrar saldo'}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.tituloCard}>Últimas transações</Text>

          {!!erro && <Text style={styles.erro}>{erro}</Text>}

          {!erro && transacoes.length === 0 && (
            <Text style={styles.vazio}>
              Nenhuma transação ainda. Cadastre a primeira para acompanhar suas finanças.
            </Text>
          )}

          {transacoes.slice(0, ULTIMAS).map((tx) => (
            <View key={tx.id} style={styles.linha}>
              <View style={styles.linhaTexto}>
                <Text style={styles.linhaTipo}>{TYPE_LABEL[tx.type]}</Text>
                {!!tx.description && (
                  <Text style={styles.linhaDescricao} numberOfLines={1}>
                    {tx.description}
                  </Text>
                )}
                <Text style={styles.linhaData}>{formatDate(tx.date)}</Text>
              </View>
              <Text style={[styles.valor, tx.amount < 0 ? styles.debito : styles.credito]}>
                {formatBrl(tx.amount)}
              </Text>
            </View>
          ))}
        </View>

        <Button title="Sair" onPress={signOut} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Colors.background },
  conteudo: { padding: Spacing.md, gap: Spacing.md },
  cardSaldo: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  saudacao: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.onPrimary },
  data: { marginTop: Spacing.xs, fontSize: FontSize.sm, color: Colors.onPrimary, opacity: 0.9 },
  conta: { marginTop: Spacing.md },
  contaTipo: { fontSize: FontSize.sm, color: Colors.onPrimary, opacity: 0.9 },
  contaLinha: { fontSize: FontSize.xs, color: Colors.onPrimary, opacity: 0.75, marginTop: 2 },
  saldo: {
    marginTop: Spacing.lg,
    fontSize: FontSize.hero,
    fontWeight: '300',
    color: Colors.onPrimary,
  },
  saldoNegativo: { color: '#FCA5A5' },
  toggle: { marginTop: Spacing.xs, fontSize: FontSize.sm, color: Colors.warning, fontWeight: '600' },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  tituloCard: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  vazio: { marginTop: Spacing.md, fontSize: FontSize.sm, color: Colors.textSecondary },
  erro: { marginTop: Spacing.md, fontSize: FontSize.sm, color: Colors.error },
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
  linhaTipo: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  linhaDescricao: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  linhaData: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  valor: { fontSize: FontSize.md, fontWeight: '700' },
  credito: { color: Colors.credito },
  debito: { color: Colors.debito },
});
