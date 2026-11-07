import { useCallback, useState } from 'react';

import { suggestCategory, type Category } from '@/modules/transactions/domain/category';
import type {
  DepositType,
  Transaction,
  TransactionInput,
  TransactionType,
} from '@/modules/transactions/domain/types';
import { validarTransacao, type ErrosDeTransacao } from '@/modules/transactions/domain/validation';
import { maskAmount, parseAmount } from '@/shared/domain/format';

export type ErrosDoFormulario = ErrosDeTransacao & { geral?: string };

/** Estado e regras do formulário de transação, comuns ao cadastro e à edição. */
export function useTransacaoForm({ sugerirCategoria = false } = {}) {
  const [tipo, setTipo] = useState<TransactionType>('deposito');
  const [depositType, setDepositType] = useState<DepositType>('own');
  const [valor, setValorBruto] = useState('');
  const [descricao, setDescricaoBruta] = useState('');
  const [categoria, setCategoriaBruta] = useState<Category | null>(null);
  const [categoriaTocada, setCategoriaTocada] = useState(false);
  const [data, setData] = useState(new Date());
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [erros, setErros] = useState<ErrosDoFormulario>({});

  const ehPix = tipo === 'pix';
  const ehDepositoOutraConta = tipo === 'deposito' && depositType === 'other';

  /**
   * Sugere a categoria pela descrição enquanto o usuário digita, mas para de
   * sugerir assim que ele escolher uma manualmente — sobrescrever uma escolha
   * deliberada seria pior que não sugerir nada.
   */
  function setDescricao(texto: string) {
    setDescricaoBruta(texto);
    if (sugerirCategoria && !categoriaTocada) setCategoriaBruta(suggestCategory(texto));
  }

  function setCategoria(c: Category | null) {
    setCategoriaTocada(true);
    setCategoriaBruta(c);
  }

  function montarEntrada(): TransactionInput {
    return {
      type: tipo,
      depositType: tipo === 'deposito' ? depositType : undefined,
      amount: parseAmount(valor),
      date: data,
      description: descricao.trim() || undefined,
      category: categoria ?? undefined,
      ...(ehPix ? { pixKey: pixKey.trim() } : {}),
      ...(ehDepositoOutraConta ? { agency: agencia.trim(), account: conta.trim() } : {}),
    };
  }

  /** Valida e devolve a entrada pronta, ou `null` se houver erro nos campos. */
  function validar(): TransactionInput | null {
    const entrada = montarEntrada();
    const proximos = validarTransacao(entrada);
    setErros(proximos);
    return Object.keys(proximos).length === 0 ? entrada : null;
  }

  function limpar() {
    setValorBruto('');
    setDescricaoBruta('');
    setCategoriaBruta(null);
    setCategoriaTocada(false);
    setData(new Date());
    setAgencia('');
    setConta('');
    setPixKey('');
    setErros({});
  }

  const preencher = useCallback((tx: Transaction) => {
    setTipo(tx.type);
    setDepositType(tx.depositType ?? 'own');
    // O formulário trabalha com valor absoluto; o sinal é reaplicado ao salvar,
    // a partir do tipo e do destino.
    setValorBruto(maskAmount(String(Math.round(Math.abs(tx.amount) * 100))));
    setDescricaoBruta(tx.description ?? '');
    setCategoriaBruta(tx.category ?? null);
    setData(tx.date);
    setAgencia(tx.agency ?? '');
    setConta(tx.account ?? '');
    setPixKey(tx.pixKey ?? '');
  }, []);

  const setErroGeral = useCallback((mensagem: string) => setErros({ geral: mensagem }), []);

  return {
    tipo,
    setTipo,
    depositType,
    setDepositType,
    valor,
    setValor: (texto: string) => setValorBruto(maskAmount(texto)),
    descricao,
    setDescricao,
    categoria,
    setCategoria,
    data,
    setData,
    agencia,
    setAgencia,
    conta,
    setConta,
    pixKey,
    setPixKey,
    erros,
    setErroGeral,
    ehPix,
    ehDepositoOutraConta,
    validar,
    limpar,
    preencher,
  };
}

export type TransacaoFormState = ReturnType<typeof useTransacaoForm>;
