import DateTimePicker from '@react-native-community/datetimepicker';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORIES } from '@/modules/transactions/domain/category';
import {
  DEPOSIT_TYPE_LABEL,
  TRANSACTION_TYPES,
  TYPE_LABEL_CURTO,
} from '@/modules/transactions/domain/transaction';
import type { DepositType, TransactionType } from '@/modules/transactions/domain/types';
import type { TransacaoFormState } from '@/modules/transactions/presentation/hooks/useTransacaoForm';
import { formatDate } from '@/shared/domain/format';
import { Input } from '@/shared/ui/Input';
import { SegmentedControl, type OpcaoDeSegmento } from '@/shared/ui/SegmentedControl';
import { Select } from '@/shared/ui/Select';
import { Colors, FontSize, Radius, Spacing } from '@/shared/ui/theme';

const OPCOES_DE_TIPO: OpcaoDeSegmento<TransactionType>[] = TRANSACTION_TYPES.map((t) => ({
  valor: t,
  rotulo: TYPE_LABEL_CURTO[t],
}));

const OPCOES_DE_DESTINO: OpcaoDeSegmento<DepositType>[] = (['own', 'other'] as const).map((d) => ({
  valor: d,
  rotulo: DEPOSIT_TYPE_LABEL[d],
}));

type Props = {
  form: TransacaoFormState;
  /** Seletor de comprovante: o envio difere entre cadastro e edição. */
  recibo: ReactNode;
  /** Mensagens e botões da tela, abaixo do erro geral. */
  children: ReactNode;
};

/** Campos da transação, comuns às telas de cadastro e de edição. */
export function TransacaoForm({ form, recibo, children }: Props) {
  const [mostrandoData, setMostrandoData] = useState(false);
  const { erros } = form;

  return (
    <View style={styles.card}>
      <View style={styles.campo}>
        <Text style={styles.rotulo}>Tipo de transação</Text>
        <SegmentedControl
          rotulo="Tipo de transação"
          opcoes={OPCOES_DE_TIPO}
          selecionado={form.tipo}
          onSelecionar={form.setTipo}
        />
      </View>

      {form.tipo === 'deposito' && (
        <View style={styles.campo}>
          <Text style={styles.rotulo}>Destino do depósito</Text>
          <SegmentedControl
            rotulo="Destino do depósito"
            opcoes={OPCOES_DE_DESTINO}
            selecionado={form.depositType}
            onSelecionar={form.setDepositType}
          />
          {form.ehDepositoOutraConta && (
            <Text style={styles.aviso}>Depósito em outra conta sai do seu saldo.</Text>
          )}
        </View>
      )}

      <Input
        label="Valor"
        value={form.valor}
        onChangeText={form.setValor}
        placeholder="0,00"
        keyboardType="numeric"
        error={erros.valor}
      />

      <View style={styles.campo}>
        <Text style={styles.rotulo}>Data</Text>
        <Pressable
          onPress={() => setMostrandoData(true)}
          accessibilityRole="button"
          accessibilityLabel={`Data da transação: ${formatDate(form.data)}`}
          style={[styles.campoData, !!erros.data && styles.campoComErro]}
        >
          <Text style={styles.campoDataTexto}>{formatDate(form.data)}</Text>
        </Pressable>
        {!!erros.data && <Text style={styles.erroCampo}>{erros.data}</Text>}
      </View>

      {mostrandoData && (
        <DateTimePicker
          value={form.data}
          mode="date"
          // O picker impede a data futura na própria interface; a validação
          // continua porque a regra é do domínio, não da UI.
          maximumDate={new Date()}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_evento, selecionada) => {
            setMostrandoData(Platform.OS === 'ios');
            if (selecionada) form.setData(selecionada);
          }}
        />
      )}

      <Input
        label="Descrição (opcional)"
        value={form.descricao}
        onChangeText={form.setDescricao}
        placeholder="Ex.: aluguel, freelance..."
      />

      <View style={styles.campo}>
        <Select
          label="Categoria"
          opcoes={CATEGORIES}
          selecionado={form.categoria}
          onSelecionar={form.setCategoria}
          rotuloVazio="Nenhuma"
          error={erros.categoria}
        />
      </View>

      {form.ehPix && (
        <Input
          label="Chave Pix"
          value={form.pixKey}
          onChangeText={form.setPixKey}
          placeholder="e-mail, telefone ou chave aleatória"
          autoCapitalize="none"
          error={erros.pixKey}
        />
      )}

      {form.ehDepositoOutraConta && (
        <>
          <Input
            label="Agência de destino"
            value={form.agencia}
            onChangeText={form.setAgencia}
            placeholder="0000"
            keyboardType="numeric"
            maxLength={6}
          />
          <Input
            label="Conta de destino"
            value={form.conta}
            onChangeText={form.setConta}
            placeholder="00000-0"
            keyboardType="numeric"
            maxLength={10}
            error={erros.destino}
          />
        </>
      )}

      {recibo}

      {!!erros.geral && (
        <Text style={styles.erroGeral} accessibilityRole="alert">
          {erros.geral}
        </Text>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  // Mesmo respiro do `Input`: todos os campos ficam igualmente espaçados, e cada
  // rótulo mais perto do próprio controle do que do campo anterior.
  campo: { marginBottom: Spacing.md },
  rotulo: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
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
});
