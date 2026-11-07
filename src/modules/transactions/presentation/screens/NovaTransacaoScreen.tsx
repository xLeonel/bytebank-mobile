import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReciboPicker } from '@/modules/transactions/presentation/components/ReciboPicker';
import { TransacaoForm } from '@/modules/transactions/presentation/components/TransacaoForm';
import { useTransacaoForm } from '@/modules/transactions/presentation/hooks/useTransacaoForm';
import { useAcoesDeTransacao } from '@/modules/transactions/presentation/hooks/useTransacoes';
import { Button } from '@/shared/ui/Button';
import { Colors, FontSize, Spacing } from '@/shared/ui/theme';

export default function NovaTransacaoScreen() {
  const router = useRouter();
  const { criar } = useAcoesDeTransacao();
  const form = useTransacaoForm({ sugerirCategoria: true });

  const [reciboUri, setReciboUri] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function handleSalvar() {
    const entrada = form.validar();
    if (!entrada) return;

    setEnviando(true);
    setSucesso(false);
    try {
      const { erroDoRecibo } = await criar(entrada, reciboUri);
      if (erroDoRecibo) console.warn('[recibo] falha ao anexar:', erroDoRecibo.message);

      form.limpar();
      setReciboUri(null);
      setSucesso(true);
      router.push('/(app)/(tabs)/home');
    } catch (e) {
      form.setErroGeral((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <Text style={styles.titulo}>Nova transação</Text>

          <TransacaoForm
            form={form}
            recibo={
              <ReciboPicker
                anexos={[]}
                uriPendente={reciboUri}
                onEscolher={(uri) => setReciboUri(uri)}
                onRemoverPendente={() => setReciboUri(null)}
              />
            }
          >
            {sucesso && (
              <Text style={styles.sucesso} accessibilityRole="alert">
                Transação registrada.
              </Text>
            )}

            <View style={styles.espaco} />
            <Button title="Concluir transação" onPress={handleSalvar} loading={enviando} />
          </TransacaoForm>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  conteudo: { padding: Spacing.md, paddingBottom: Spacing.xl },
  titulo: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  espaco: { height: Spacing.md },
  sucesso: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.success,
    textAlign: 'center',
  },
});
