import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { casosDeTransacoes } from '@/composition/container';
import { useAuth } from '@/modules/auth/presentation/AuthContext';
import type { AnexoVisivel } from '@/modules/transactions/domain/types';
import { ReciboPicker } from '@/modules/transactions/presentation/components/ReciboPicker';
import { TransacaoForm } from '@/modules/transactions/presentation/components/TransacaoForm';
import { useTransacaoForm } from '@/modules/transactions/presentation/hooks/useTransacaoForm';
import { useAcoesDeTransacao } from '@/modules/transactions/presentation/hooks/useTransacoes';
import { Button } from '@/shared/ui/Button';
import { avisar } from '@/shared/ui/Aviso';
import { confirmar } from '@/shared/ui/confirmar';
import { Colors, FontSize, Spacing } from '@/shared/ui/theme';

export default function EditarTransacaoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const uid = useAuth().user?.uid;
  const { atualizar, remover } = useAcoesDeTransacao();
  const form = useTransacaoForm();
  const { preencher, setErroGeral } = form;

  // Aberta direto pela URL ou por um link, a tela não tem para onde voltar.
  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/(tabs)/home');
  }

  const [carregando, setCarregando] = useState(true);
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  const [anexos, setAnexos] = useState<AnexoVisivel[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [enviandoRecibo, setEnviandoRecibo] = useState(false);

  useEffect(() => {
    if (!uid || !id) return;
    let cancelado = false;

    casosDeTransacoes
      .buscarPorId(uid, id)
      .then(async (tx) => {
        if (cancelado) return;
        if (!tx) {
          setNaoEncontrada(true);
          return;
        }
        preencher(tx);
        const visiveis = await casosDeTransacoes.comUrls(tx.attachments);
        if (!cancelado) setAnexos(visiveis);
      })
      .catch((e: Error) => {
        if (!cancelado) setErroGeral(e.message);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [uid, id, preencher, setErroGeral]);

  async function handleSalvar() {
    const entrada = form.validar();
    if (!entrada || !id) return;

    setSalvando(true);
    try {
      await atualizar(id, entrada);
      avisar('Transação atualizada.');
      voltar();
    } catch (e) {
      form.setErroGeral((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  function confirmarExclusao() {
    confirmar({
      titulo: 'Excluir transação',
      mensagem: 'Esta ação não pode ser desfeita.',
      acao: 'Excluir',
      aoConfirmar: async () => {
        if (!id) return;
        try {
          await remover(id);
          avisar('Transação excluída.');
          voltar();
        } catch (e) {
          form.setErroGeral((e as Error).message);
        }
      },
    });
  }

  async function anexar(uri: string) {
    if (!uid || !id) return;
    setEnviandoRecibo(true);
    try {
      const anexo = await casosDeTransacoes.anexarRecibo(uid, id, uri);
      setAnexos((atuais) => [...atuais, anexo]);
    } catch (e) {
      form.setErroGeral((e as Error).message);
    } finally {
      setEnviandoRecibo(false);
    }
  }

  async function desanexar(anexo: AnexoVisivel) {
    if (!uid || !id) return;
    try {
      await casosDeTransacoes.removerRecibo(uid, id, anexo.path);
      setAnexos((atuais) => atuais.filter((a) => a.path !== anexo.path));
    } catch (e) {
      form.setErroGeral((e as Error).message);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={[styles.tela, styles.centro]} edges={['top']}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (naoEncontrada) {
    return (
      <SafeAreaView style={[styles.tela, styles.centro]} edges={['top']}>
        <Text style={styles.vazio}>Transação não encontrada.</Text>
        <Button title="Voltar" onPress={() => voltar()} variant="secondary" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <View style={styles.cabecalho}>
            <Pressable
              onPress={() => voltar()}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              style={({ pressed }) => [styles.voltar, pressed && styles.pressionado]}
            >
              <Ionicons name="chevron-back" size={26} color={Colors.primary} />
            </Pressable>
            <Text style={styles.titulo}>Editar transação</Text>
          </View>

          <TransacaoForm
            form={form}
            recibo={
              // Na edição a transação já existe, então o upload é imediato — não
              // há URI pendente esperando um id, como acontece no cadastro.
              <ReciboPicker
                anexos={anexos}
                onEscolher={anexar}
                onRemover={desanexar}
                enviando={enviandoRecibo}
              />
            }
          >
            <View style={styles.espaco} />
            <Button title="Salvar alterações" onPress={handleSalvar} loading={salvando} />
            <View style={styles.espacoPequeno} />
            <Button title="Excluir transação" onPress={confirmarExclusao} variant="ghost" />
          </TransacaoForm>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  centro: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
  conteudo: { padding: Spacing.md, paddingBottom: Spacing.xl },
  cabecalho: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  // 44 px de alvo de toque; a margem negativa alinha o desenho da seta, e não a
  // área invisível em volta dela, com a borda do card abaixo.
  voltar: {
    width: 44,
    height: 44,
    marginLeft: -Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressionado: { opacity: 0.6 },
  titulo: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  espaco: { height: Spacing.md },
  espacoPequeno: { height: Spacing.sm },
  vazio: { fontSize: FontSize.md, color: Colors.textSecondary },
});
