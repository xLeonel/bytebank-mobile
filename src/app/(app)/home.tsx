import { ScrollView, StyleSheet, Text, View } from 'react-native';
// O SafeAreaView do react-native está deprecado e, no iOS, não respeita o
// notch corretamente. O do safe-area-context lê os insets reais do aparelho.
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { formatTodayGreeting } from '@/domain/format';

/**
 * Placeholder da home. O dashboard com gráficos e as transições animadas
 * entram na etapa 8; por ora esta tela existe para validar ponta a ponta o
 * fluxo de autenticação e a persistência da sessão.
 */
export default function HomeScreen() {
  const { user, profile, signOut } = useAuth();
  const primeiroNome = (profile?.name ?? user?.displayName ?? '').split(' ')[0] || 'você';

  return (
    <SafeAreaView style={styles.tela}>
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
        </View>

        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>
            Autenticação funcionando. Dashboard, extrato e lançamentos entram nas próximas etapas.
          </Text>
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
  aviso: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  avisoTexto: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
