import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipGroup } from '@/components/Chip';
import { Select } from '@/components/Select';
import { Shimmer } from '@/components/Shimmer';
import { TransactionRow } from '@/components/TransactionRow';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORIES, type Category } from '@/domain/category';
import { TRANSACTION_TYPES, TYPE_LABEL } from '@/domain/transaction';
import type { Transaction, TransactionType } from '@/domain/types';
import { buscarPagina, type Filtros } from '@/lib/transactions';

const POR_PAGINA = 15;

export default function ExtratoScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [tipo, setTipo] = useState<TransactionType | null>(null);
  const [categoria, setCategoria] = useState<Category | null>(null);

  const [itens, setItens] = useState<Transaction[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [acabou, setAcabou] = useState(false);
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const filtros: Filtros = {
    ...(tipo ? { type: tipo } : {}),
    ...(categoria ? { category: categoria } : {}),
  };

  /**
   * Recarrega do zero. Roda na montagem e sempre que um filtro muda — o cursor
   * de uma consulta não vale para outra, então precisa ser descartado junto.
   */
  useEffect(() => {
    if (!user) return;
    let cancelado = false;

    setCarregandoInicial(true);
    setErro(null);

    buscarPagina(user.uid, { filtros, tamanho: POR_PAGINA })
      .then((pagina) => {
        if (cancelado) return;
        setItens(pagina.itens);
        setCursor(pagina.cursor);
        setAcabou(pagina.acabou);
      })
      .catch((e: Error) => {
        if (!cancelado) setErro(e.message);
      })
      .finally(() => {
        if (!cancelado) setCarregandoInicial(false);
      });

    return () => {
      cancelado = true;
    };
    // `filtros` é recriado a cada render; as dependências reais são os valores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tipo, categoria]);

  const carregarMais = useCallback(async () => {
    // Sem as guardas, o onEndReached dispara em rajada durante a rolagem e
    // pediria a mesma página várias vezes, duplicando itens na lista.
    if (!user || !cursor || acabou || carregandoMais || carregandoInicial) return;

    setCarregandoMais(true);
    try {
      const pagina = await buscarPagina(user.uid, { filtros, cursor, tamanho: POR_PAGINA });
      setItens((atuais) => [...atuais, ...pagina.itens]);
      setCursor(pagina.cursor);
      setAcabou(pagina.acabou);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregandoMais(false);
    }
  }, [user, cursor, acabou, carregandoMais, carregandoInicial, filtros]);

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Extrato</Text>

        <Text style={styles.rotuloFiltro}>Tipo</Text>
        <ChipGroup
          opcoes={TRANSACTION_TYPES}
          selecionado={tipo}
          onSelecionar={setTipo}
          rotulo={(t) => TYPE_LABEL[t]}
        />

        <View style={styles.filtroCategoria}>
          <Select
            label="Categoria"
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
            ) : null
          }
        />
      )}

      {!!erro && (
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
  cabecalho: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  titulo: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  rotuloFiltro: {
    // lg, não md: os chips têm altura própria e com espaço menor o rótulo do
    // filtro seguinte parece pertencer ao grupo de cima.
    marginTop: Spacing.lg,
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filtroCategoria: { marginTop: Spacing.lg },
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
