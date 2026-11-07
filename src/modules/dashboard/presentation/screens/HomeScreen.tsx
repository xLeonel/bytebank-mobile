import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// O SafeAreaView do react-native está deprecado e, no iOS, não respeita o
// notch corretamente. O do safe-area-context lê os insets reais do aparelho.
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnaliseFinanceira } from '@/modules/dashboard/presentation/components/charts/AnaliseFinanceira';
import { HomeSkeleton } from '@/modules/dashboard/presentation/components/HomeSkeleton';
import { TransactionRow } from '@/modules/transactions/presentation/components/TransactionRow';
import { Colors, FontSize, Radius, Spacing } from '@/shared/ui/theme';
import { useAuth } from '@/modules/auth/presentation/AuthContext';
import { useTransacoes } from '@/modules/transactions/presentation/hooks/useTransacoes';
import { formatBrl, formatTodayGreeting } from '@/shared/domain/format';

const ULTIMAS = 5;

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const transacoes = useTransacoes((e) => e.transacoes);
  const saldo = useTransacoes((e) => e.saldo);
  const carregando = useTransacoes((e) => e.carregando);
  const erro = useTransacoes((e) => e.erro);
  const [saldoVisivel, setSaldoVisivel] = useState(true);
  const router = useRouter();

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
            hitSlop={12}
            style={styles.toggle}
          >
            <Ionicons
              name={saldoVisivel ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={Colors.warning}
            />
            <Text style={styles.toggleTexto}>
              {saldoVisivel ? 'Ocultar saldo' : 'Mostrar saldo'}
            </Text>
          </Pressable>
        </View>

        {transacoes.length > 0 && (
          <AnaliseFinanceira transacoes={transacoes} saldo={saldo} />
        )}

        <View style={styles.card}>
          <Text style={styles.tituloCard}>Últimas transações</Text>

          {!!erro && <Text style={styles.erro}>{erro}</Text>}

          {!erro && transacoes.length === 0 && (
            <Text style={styles.vazio}>
              Nenhuma transação ainda. Cadastre a primeira para acompanhar suas finanças.
            </Text>
          )}

          {transacoes.slice(0, ULTIMAS).map((tx, i) => (
            <TransactionRow
              key={tx.id}
              transacao={tx}
              comSeparador={i > 0}
              onPress={(t) => router.push({ pathname: '/(app)/transacao/[id]', params: { id: t.id } })}
            />
          ))}

          {/* Só aparece quando há o que ver além das 5 — um link para "todas"
              que mostra o mesmo conteúdo seria promessa vazia. */}
          {transacoes.length > ULTIMAS && (
            <Link href="/(app)/(tabs)/extrato" asChild>
              <Pressable
                style={styles.verTodas}
                accessibilityRole="link"
                accessibilityLabel="Ver todas as transações no extrato"
              >
                <Text style={styles.verTodasTexto}>Ver todas as transações no extrato</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
              </Pressable>
            </Link>
          )}
        </View>
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
  toggle: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
  },
  toggleTexto: { fontSize: FontSize.sm, color: Colors.warning, fontWeight: '600' },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  tituloCard: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  vazio: { marginTop: Spacing.md, fontSize: FontSize.sm, color: Colors.textSecondary },
  erro: { marginTop: Spacing.md, fontSize: FontSize.sm, color: Colors.error },
  verTodas: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 44, // alvo de toque mínimo confortável
  },
  verTodasTexto: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
});
