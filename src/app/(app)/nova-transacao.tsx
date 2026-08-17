import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTransactions } from '@/contexts/TransactionsContext';
import { CATEGORIES, suggestCategory, type Category } from '@/domain/category';
import { formatDate, maskAmount, parseAmount } from '@/domain/format';
import { DEPOSIT_TYPE_LABEL, TRANSACTION_TYPES, TYPE_LABEL } from '@/domain/transaction';
import type { DepositType, TransactionType } from '@/domain/types';
import {
  validateAmount,
  validateCategory,
  validateDateNotFuture,
  validateDestino,
  validatePixKey,
} from '@/domain/validation';

type Erros = Partial<Record<'valor' | 'data' | 'categoria' | 'pixKey' | 'destino' | 'geral', string>>;

export default function NovaTransacaoScreen() {
  const router = useRouter();
  const { criar } = useTransactions();

  const [tipo, setTipo] = useState<TransactionType>('deposito');
  const [depositType, setDepositType] = useState<DepositType>('own');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<Category | null>(null);
  const [categoriaTocada, setCategoriaTocada] = useState(false);
  const [data, setData] = useState(new Date());
  const [mostrandoData, setMostrandoData] = useState(false);
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [pixKey, setPixKey] = useState('');

  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const ehPix = tipo === 'pix';
  const ehDepositoOutraConta = tipo === 'deposito' && depositType === 'other';

  /**
   * Sugere a categoria pela descrição enquanto o usuário digita, mas para de
   * sugerir assim que ele escolher uma manualmente — sobrescrever uma escolha
   * deliberada seria pior que não sugerir nada.
   */
  function aoDigitarDescricao(texto: string) {
    setDescricao(texto);
    if (!categoriaTocada) setCategoria(suggestCategory(texto));
  }

  function validar(): boolean {
    const proximos: Erros = {};

    const valorNumerico = parseAmount(valor);
    const checkValor = validateAmount(valorNumerico);
    if (!checkValor.valid) proximos.valor = checkValor.message;

    const checkData = validateDateNotFuture(data);
    if (!checkData.valid) proximos.data = checkData.message;

    const checkCategoria = validateCategory(categoria ?? undefined);
    if (!checkCategoria.valid) proximos.categoria = checkCategoria.message;

    if (ehPix) {
      const checkPix = validatePixKey(pixKey);
      if (!checkPix.valid) proximos.pixKey = checkPix.message;
    }

    if (ehDepositoOutraConta) {
      const checkDestino = validateDestino(agencia, conta);
      if (!checkDestino.valid) proximos.destino = checkDestino.message;
    }

    setErros(proximos);
    return Object.keys(proximos).length === 0;
  }

  function limpar() {
    setValor('');
    setDescricao('');
    setCategoria(null);
    setCategoriaTocada(false);
    setData(new Date());
    setAgencia('');
    setConta('');
    setPixKey('');
    setErros({});
  }

  async function handleSalvar() {
    if (!validar()) return;

    setEnviando(true);
    setSucesso(false);
    try {
      await criar({
        type: tipo,
        // O destino só faz sentido em depósito; em outro tipo seria ruído no
        // documento. O sinal do valor sai daqui, em applySign.
        depositType: tipo === 'deposito' ? depositType : undefined,
        amount: parseAmount(valor),
        date: data,
        description: descricao.trim() || undefined,
        category: categoria ?? undefined,
        ...(ehPix ? { pixKey: pixKey.trim() } : {}),
        ...(ehDepositoOutraConta ? { agency: agencia.trim(), account: conta.trim() } : {}),
      });

      limpar();
      setSucesso(true);
      router.push('/(app)/home');
    } catch (e) {
      setErros({ geral: (e as Error).message });
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

          <View style={styles.card}>
            <Text style={styles.rotulo}>Tipo de transação</Text>
            <View style={styles.linhaChips}>
              {TRANSACTION_TYPES.map((t) => (
                <Chip
                  key={t}
                  label={TYPE_LABEL[t]}
                  ativo={tipo === t}
                  onPress={() => setTipo(t)}
                />
              ))}
            </View>

            {tipo === 'deposito' && (
              <>
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
                {ehDepositoOutraConta && (
                  <Text style={styles.aviso}>
                    Depósito em outra conta sai do seu saldo.
                  </Text>
                )}
              </>
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
                // O picker impede a data futura na própria interface; a
                // validação continua porque a regra é do domínio, não da UI.
                maximumDate={new Date()}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_evento, selecionada) => {
                  setMostrandoData(Platform.OS === 'ios');
                  if (selecionada) setData(selecionada);
                }}
              />
            )}

            <View style={styles.espaco} />

            <Input
              label="Descrição (opcional)"
              value={descricao}
              onChangeText={aoDigitarDescricao}
              placeholder="Ex.: aluguel, freelance..."
            />

            <Text style={styles.rotulo}>Categoria</Text>
            <ChipGroup
              opcoes={CATEGORIES}
              selecionado={categoria}
              onSelecionar={(c) => {
                setCategoriaTocada(true);
                setCategoria(c);
              }}
              rotuloTodos="Nenhuma"
            />
            {!!erros.categoria && <Text style={styles.erroCampo}>{erros.categoria}</Text>}

            {ehPix && (
              <>
                <View style={styles.espaco} />
                <Input
                  label="Chave Pix"
                  value={pixKey}
                  onChangeText={setPixKey}
                  placeholder="e-mail, telefone ou chave aleatória"
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
                  placeholder="0000"
                  keyboardType="numeric"
                  maxLength={6}
                />
                <Input
                  label="Conta de destino"
                  value={conta}
                  onChangeText={setConta}
                  placeholder="00000-0"
                  keyboardType="numeric"
                  maxLength={10}
                  error={erros.destino}
                />
              </>
            )}

            {!!erros.geral && (
              <Text style={styles.erroGeral} accessibilityRole="alert">
                {erros.geral}
              </Text>
            )}
            {sucesso && (
              <Text style={styles.sucesso} accessibilityRole="alert">
                Transação registrada.
              </Text>
            )}

            <View style={styles.espaco} />
            <Button title="Concluir transação" onPress={handleSalvar} loading={enviando} />
          </View>
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
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  rotulo: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  linhaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  espaco: { height: Spacing.md },
  aviso: {
    marginTop: Spacing.sm,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  campoData: {
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
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
  sucesso: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.success,
    textAlign: 'center',
  },
});
