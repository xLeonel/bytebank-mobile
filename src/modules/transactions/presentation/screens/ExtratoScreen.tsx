import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SegmentedControl, type OpcaoDeSegmento } from '@/shared/ui/SegmentedControl';
import { Select } from '@/shared/ui/Select';
import { Shimmer } from '@/shared/ui/Shimmer';
import { TransactionRow } from '@/modules/transactions/presentation/components/TransactionRow';
import { Colors, FontSize, Radius, Spacing } from '@/shared/ui/theme';
import { casosDeTransacoes } from '@/composition/container';
import { useAuth } from '@/modules/auth/presentation/AuthContext';
import type { CursorDePagina } from '@/modules/transactions/application/ports';
import { CATEGORIES, type Category } from '@/modules/transactions/domain/category';
import { TRANSACTION_TYPES, TYPE_LABEL_CURTO } from '@/modules/transactions/domain/transaction';
import type { Filtros, Transaction, TransactionType } from '@/modules/transactions/domain/types';
import { iniciarMedicao } from '@/shared/ui/marcarPerf';

const POR_PAGINA = 15;

const OPCOES_DE_TIPO: OpcaoDeSegmento<TransactionType | null>[] = [
  { valor: null, rotulo: 'Todos' },
  ...TRANSACTION_TYPES.map((t) => ({ valor: t, rotulo: TYPE_LABEL_CURTO[t] })),
];

export default function ExtratoScreen() {
  const uid = useAuth().user?.uid;
  const router = useRouter();

  const [tipo, setTipo] = useState<TransactionType | null>(null);
  const [categoria, setCategoria] = useState<Category | null>(null);

  const [itens, setItens] = useState<Transaction[]>([]);
  const [cursor, setCursor] = useState<CursorDePagina | null>(null);
  const [acabou, setAcabou] = useState(false);
  const [consultaCarregada, setConsultaCarregada] = useState<Filtros | null>(null);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const filtros = useMemo<Filtros>(
    () => ({
      ...(tipo ? { type: tipo } : {}),
      ...(categoria ? { category: categoria } : {}),
    }),
    [tipo, categoria],
  );

  // Trocar de filtro já conta como carregando, no mesmo render da troca.
  const carregandoInicial = consultaCarregada !== filtros;

  /**
   * Recarrega do zero. Roda na montagem e sempre que um filtro muda — o cursor
   * de uma consulta não vale para outra, então precisa ser descartado junto.
   */
  useEffect(() => {
    if (!uid) return;
    let cancelado = false;

    const medirPagina = iniciarMedicao('primeira pagina do extrato');
    casosDeTransacoes
      .buscarPagina(uid, { filtros, tamanho: POR_PAGINA })
      .then((pagina) => {
        if (cancelado) return;
        medirPagina();
        setItens(pagina.itens);
        setCursor(pagina.cursor);
        setAcabou(pagina.acabou);
        setErro(null);
      })
      .catch((e: Error) => {
        if (!cancelado) setErro(e.message);
      })
      .finally(() => {
        if (!cancelado) setConsultaCarregada(filtros);
      });

    return () => {
      cancelado = true;
    };
  }, [uid, filtros]);

  const carregarMais = useCallback(async () => {
    // Sem as guardas, o onEndReached dispara em rajada durante a rolagem e
    // pediria a mesma página várias vezes, duplicando itens na lista.
    if (!uid || !cursor || acabou || carregandoMais || carregandoInicial) return;

    setCarregandoMais(true);
    try {
      const pagina = await casosDeTransacoes.buscarPagina(uid, {
        filtros,
        cursor,
        tamanho: POR_PAGINA,
      });
      setItens((atuais) => [...atuais, ...pagina.itens]);
      setCursor(pagina.cursor);
      setAcabou(pagina.acabou);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregandoMais(false);
    }
  }, [uid, cursor, acabou, carregandoMais, carregandoInicial, filtros]);

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Extrato</Text>

        <View style={styles.filtros}>
          <SegmentedControl
            rotulo="Filtrar por tipo"
            opcoes={OPCOES_DE_TIPO}
            selecionado={tipo}
            onSelecionar={setTipo}
          />
          <Select
            label="Categoria"
            ocultarRotulo
            rotuloVazio="Todas as categorias"
            opcoes={CATEGORIES}
            selecionado={categoria}
            onSelecionar={setCategoria}
          />
        </View>
      </View>

      {carregandoInicial ? (
        <View style={styles.lista}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.esqueletoLinha}>
              <View style={styles.esqueletoTexto}>
                <Shimmer width="50%" height={14} />
                <Shimmer width="30%" height={12} style={styles.esqueletoEspaco} />
              </View>
              <Shimmer width={80} height={16} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={itens}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item, index }) => (
            <TransactionRow
              transacao={item}
              comSeparador={index > 0}
              onPress={(tx) => router.push({ pathname: '/(app)/transacao/[id]', params: { id: tx.id } })}
            />
          )}
          onEndReached={carregarMais}
          // 0.5 dispara com meia tela restante: cedo o bastante para a próxima
          // página chegar antes de o usuário alcançar o fim.
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <Text style={styles.vazio}>
              {erro
                ? 'Não foi possível carregar as transações.'
                : 'Nenhuma transação encontrada com esses filtros.'}
            </Text>
          }
          ListFooterComponent={
            carregandoMais ? (
              <ActivityIndicator style={styles.rodape} color={Colors.primary} />
            ) : acabou && itens.length > 0 ? (
              <Text style={styles.fim}>Fim do extrato</Text>
            ) : undefined
          }
        />
      )}

      {!!erro && !carregandoInicial && (
        <View style={styles.erroCaixa}>
          <Text style={styles.erroTexto}>{erro}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Colors.background },
  // O paddingBottom fecha o bloco de filtros; junto com o marginTop da lista
  // dá a mesma respiração que separa os cards na home.
  cabecalho: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  titulo: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  // Card próprio: agrupa os filtros e deixa mais altura de tela para a lista.
  filtros: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
  },
  // Card branco envolvendo a lista, como no web: separa o conteúdo do fundo
  // verde-claro da tela e dá contraste às linhas.
  lista: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  esqueletoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  esqueletoTexto: { flex: 1, marginRight: Spacing.md },
  esqueletoEspaco: { marginTop: Spacing.xs },
  // Padding em vez de só marginTop: dentro do card branco a mensagem tinha
  // espaço acima mas encostava embaixo.
  vazio: {
    textAlign: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  rodape: { paddingVertical: Spacing.md },
  fim: {
    textAlign: 'center',
    paddingVertical: Spacing.md,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  erroCaixa: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: '#FEE2E2',
  },
  erroTexto: { fontSize: FontSize.xs, color: Colors.error },
});
