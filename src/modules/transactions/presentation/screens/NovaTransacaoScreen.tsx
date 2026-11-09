import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReciboPicker } from '@/modules/transactions/presentation/components/ReciboPicker';
import { TransacaoForm } from '@/modules/transactions/presentation/components/TransacaoForm';
import { useTransacaoForm } from '@/modules/transactions/presentation/hooks/useTransacaoForm';
import { useAcoesDeTransacao } from '@/modules/transactions/presentation/hooks/useTransacoes';
import { avisar } from '@/shared/ui/Aviso';
import { Button } from '@/shared/ui/Button';
import { Colors, FontSize, Spacing } from '@/shared/ui/theme';

export default function NovaTransacaoScreen() {
  const router = useRouter();
  const { criar } = useAcoesDeTransacao();
  const form = useTransacaoForm({ sugerirCategoria: true });

  const [reciboUri, setReciboUri] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSalvar() {
    const entrada = form.validar();
    if (!entrada) return;

    setEnviando(true);
    try {
      const { erroDoRecibo } = await criar(entrada, reciboUri);
      if (erroDoRecibo) {
        console.warn('[recibo] falha ao anexar:', erroDoRecibo.message);
        // A transação foi salva; só o comprovante ficou para trás, e sem este aviso
        // o usuário só descobriria ao abrir a transação de novo.
        avisar('Transação registrada, mas o comprovante não foi enviado. Anexe-o na edição.', 'atencao');
      } else {
        avisar('Transação registrada.');
      }

      form.limpar();
      setReciboUri(null);
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
});
