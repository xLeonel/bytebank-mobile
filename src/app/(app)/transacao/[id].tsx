import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip, ChipGroup } from '@/components/Chip';
import { Input } from '@/components/Input';
import { ReciboPicker } from '@/components/ReciboPicker';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/contexts/TransactionsContext';
import { CATEGORIES, type Category } from '@/domain/category';
import { formatDate, maskAmount, parseAmount } from '@/domain/format';
import { DEPOSIT_TYPE_LABEL, TRANSACTION_TYPES, TYPE_LABEL } from '@/domain/transaction';
import type { Attachment, DepositType, TransactionType } from '@/domain/types';
import {
  validateAmount,
  validateCategory,
  validateDateNotFuture,
  validateDestino,
  validatePixKey,
} from '@/domain/validation';
import { anexarRecibo, buscarTransacao, removerRecibo } from '@/lib/transactions';

type Erros = Partial<Record<'valor' | 'data' | 'categoria' | 'pixKey' | 'destino' | 'geral', string>>;

export default function EditarTransacaoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { atualizar, remover } = useTransactions();

  const [carregando, setCarregando] = useState(true);
  const [naoEncontrada, setNaoEncontrada] = useState(false);

  const [tipo, setTipo] = useState<TransactionType>('deposito');
  const [depositType, setDepositType] = useState<DepositType>('own');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<Category | null>(null);
  const [data, setData] = useState(new Date());
  const [mostrandoData, setMostrandoData] = useState(false);
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [anexos, setAnexos] = useState<Attachment[]>([]);

  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);
  const [enviandoRecibo, setEnviandoRecibo] = useState(false);

  const ehPix = tipo === 'pix';
  const ehDepositoOutraConta = tipo === 'deposito' && depositType === 'other';

  useEffect(() => {
    if (!user || !id) return;
    let cancelado = false;

    buscarTransacao(user.uid, id)
      .then((tx) => {
        if (cancelado) return;
        if (!tx) {
          setNaoEncontrada(true);
          return;
        }
        setTipo(tx.type);
        setDepositType(tx.depositType ?? 'own');
        // O formulário trabalha com valor absoluto; o sinal é reaplicado por
        // applySign ao salvar, a partir do tipo e do destino.
        setValor(maskAmount(String(Math.round(Math.abs(tx.amount) * 100))));
        setDescricao(tx.description ?? '');
        setCategoria(tx.category ?? null);
        setData(tx.date);
        setAgencia(tx.agency ?? '');
        setConta(tx.account ?? '');
        setPixKey(tx.pixKey ?? '');
        setAnexos(tx.attachments);
      })
      .catch((e: Error) => {
        if (!cancelado) setErros({ geral: e.message });
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [user, id]);

  function validar(): boolean {
    const proximos: Erros = {};

    const checkValor = validateAmount(parseAmount(valor));
    if (!checkValor.valid) proximos.valor = checkValor.message;

    const checkData = validateDateNotFuture(data);
    if (!checkData.valid) proximos.data = checkData.message;

    const checkCategoria = validateCategory(categoria ?? undefined);
    if (!checkCategoria.valid) proximos.categoria = checkCategoria.message;

    if (ehPix) {
      const c = validatePixKey(pixKey);
      if (!c.valid) proximos.pixKey = c.message;
    }
    if (ehDepositoOutraConta) {
      const c = validateDestino(agencia, conta);
      if (!c.valid) proximos.destino = c.message;
    }

    setErros(proximos);
    return Object.keys(proximos).length === 0;
  }

  async function handleSalvar() {
    if (!validar() || !id) return;
    setSalvando(true);
    try {
      await atualizar(id, {
        type: tipo,
        depositType: tipo === 'deposito' ? depositType : undefined,
        amount: parseAmount(valor),
        date: data,
        description: descricao.trim() || undefined,
        category: categoria ?? undefined,
        ...(ehPix ? { pixKey: pixKey.trim() } : {}),
        ...(ehDepositoOutraConta ? { agency: agencia.trim(), account: conta.trim() } : {}),
      });
      router.back();
    } catch (e) {
      setErros({ geral: (e as Error).message });
    } finally {
      setSalvando(false);
    }
  }

  function confirmarExclusao() {
    Alert.alert('Excluir transação', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          try {
            await remover(id);
            router.back();
          } catch (e) {
            setErros({ geral: (e as Error).message });
          }
        },
      },
    ]);
  }

  async function anexar(uri: string) {
    if (!user || !id) return;
    setEnviandoRecibo(true);
    try {
      const anexo = await anexarRecibo(user.uid, id, uri, `recibo-${Date.now()}.jpg`);
      setAnexos((atuais) => [...atuais, anexo]);
    } catch (e) {
      setErros({ geral: (e as Error).message });
    } finally {
      setEnviandoRecibo(false);
    }
  }

  async function desanexar(anexo: Attachment) {
    if (!user || !id) return;
    try {
      await removerRecibo(user.uid, id, anexo);
      setAnexos((atuais) => atuais.filter((a) => a.path !== anexo.path));
    } catch (e) {
      setErros({ geral: (e as Error).message });
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
        <Button title="Voltar" onPress={() => router.back()} variant="secondary" />
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
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Text style={styles.voltar}>Voltar</Text>
            </Pressable>
            <Text style={styles.titulo}>Editar transação</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.rotulo}>Tipo de transação</Text>
            <View style={styles.linhaChips}>
              {TRANSACTION_TYPES.map((t) => (
                <Chip key={t} label={TYPE_LABEL[t]} ativo={tipo === t} onPress={() => setTipo(t)} />
              ))}
            </View>

            {tipo === 'deposito' && (
              <View style={styles.grupo}>
                <Text style={styles.rotulo}>Destino do depósito</Text>
                <View style={styles.linhaChips}>
                  {(['own', 'other'] as DepositType[]).map((d) => (
                    <Chip
                      key={d}
                      label={DEPOSIT_TYPE_LABEL[d]}
                      ativo={depositType === d}
                      onPress={() => setDepositType(d)}
                    />
                  ))}
                </View>
              </View>
            )}

            <View style={styles.espaco} />

            <Input
              label="Valor"
              value={valor}
              onChangeText={(t) => setValor(maskAmount(t))}
              placeholder="0,00"
              keyboardType="numeric"
              error={erros.valor}
            />

            <Text style={styles.rotulo}>Data</Text>
            <Pressable
              onPress={() => setMostrandoData(true)}
              accessibilityRole="button"
              accessibilityLabel={`Data da transação: ${formatDate(data)}`}
              style={[styles.campoData, !!erros.data && styles.campoComErro]}
            >
              <Text style={styles.campoDataTexto}>{formatDate(data)}</Text>
            </Pressable>
            {!!erros.data && <Text style={styles.erroCampo}>{erros.data}</Text>}

            {mostrandoData && (
              <DateTimePicker
                value={data}
                mode="date"
                maximumDate={new Date()}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e, selecionada) => {
                  setMostrandoData(Platform.OS === 'ios');
                  if (selecionada) setData(selecionada);
                }}
              />
            )}

            <View style={styles.espaco} />

            <Input
              label="Descrição (opcional)"
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Ex.: aluguel, freelance..."
            />

            <Text style={[styles.rotulo, styles.grupo]}>Categoria</Text>
            <ChipGroup
              opcoes={CATEGORIES}
              selecionado={categoria}
              onSelecionar={setCategoria}
              rotuloTodos="Nenhuma"
            />

            {ehPix && (
              <>
                <View style={styles.espaco} />
                <Input
                  label="Chave Pix"
                  value={pixKey}
                  onChangeText={setPixKey}
                  autoCapitalize="none"
                  error={erros.pixKey}
                />
              </>
            )}

            {ehDepositoOutraConta && (
              <>
                <View style={styles.espaco} />
                <Input
                  label="Agência de destino"
                  value={agencia}
                  onChangeText={setAgencia}
                  keyboardType="numeric"
                  maxLength={6}
                />
                <Input
                  label="Conta de destino"
                  value={conta}
                  onChangeText={setConta}
                  keyboardType="numeric"
                  maxLength={10}
                  error={erros.destino}
                />
              </>
            )}

            <View style={styles.espaco} />
            {/* Na edição a transação já existe, então o upload é imediato — não
                há URI pendente esperando um id, como acontece no cadastro. */}
            <ReciboPicker
              anexos={anexos}
              onEscolher={anexar}
              onRemover={desanexar}
              enviando={enviandoRecibo}
            />

            {!!erros.geral && (
              <Text style={styles.erroGeral} accessibilityRole="alert">
                {erros.geral}
              </Text>
            )}

            <View style={styles.espaco} />
            <Button title="Salvar alterações" onPress={handleSalvar} loading={salvando} />
            <View style={styles.espacoPequeno} />
            <Button title="Excluir transação" onPress={confirmarExclusao} variant="ghost" />
          </View>
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
  cabecalho: { marginBottom: Spacing.md },
  voltar: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  titulo: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginTop: Spacing.xs },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  rotulo: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.xs },
  linhaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  // Mesmo respiro entre grupos usado na tela de nova transação.
  grupo: { marginTop: Spacing.lg },
  espaco: { height: Spacing.md },
  espacoPequeno: { height: Spacing.sm },
  campoData: {
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  campoComErro: { borderColor: Colors.error },
  campoDataTexto: { fontSize: FontSize.md, color: Colors.text },
  erroCampo: { marginTop: Spacing.xs, fontSize: FontSize.xs, color: Colors.error },
  erroGeral: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.error,
    textAlign: 'center',
  },
  vazio: { fontSize: FontSize.md, color: Colors.textSecondary },
});
