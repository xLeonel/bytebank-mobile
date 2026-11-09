import { lazy, Suspense, useMemo, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/shared/ui/theme';
import { agruparPorMes, agruparPorTipo, evolucaoDoSaldo } from '@/modules/dashboard/domain/analytics';
import type { Transaction } from '@/modules/transactions/domain/types';

/**
 * Cada gráfico é carregado na primeira vez que aparece. Quem abre o app e não
 * troca de seção não paga pelos outros dois, nem pelo código de SVG deles.
 */
const EntradasSaidasChart = lazy(() =>
  import('./EntradasSaidasChart').then((m) => ({ default: m.EntradasSaidasChart })),
);
const MovimentacaoPorTipoChart = lazy(() =>
  import('./MovimentacaoPorTipoChart').then((m) => ({ default: m.MovimentacaoPorTipoChart })),
);
const SaldoEvolucaoChart = lazy(() =>
  import('./SaldoEvolucaoChart').then((m) => ({ default: m.SaldoEvolucaoChart })),
);

type Secao = 'mes' | 'tipo' | 'saldo';

const SECOES: { id: Secao; rotulo: string }[] = [
  { id: 'mes', rotulo: 'Entradas e saídas' },
  { id: 'tipo', rotulo: 'Por tipo' },
  { id: 'saldo', rotulo: 'Evolução' },
];

const DURACAO = 180;
const DESLOCAMENTO = 24;

/**
 * Análise financeira com transição animada entre seções.
 *
 * A troca é feita em duas etapas: a seção atual sai (fade + deslocamento
 * lateral) e só então o conteúdo é trocado e a nova entra. Animar durante a
 * troca de conteúdo faria os dois gráficos aparecerem sobrepostos no mesmo
 * frame.
 *
 * O sentido do deslocamento acompanha a direção da navegação — indo para uma
 * seção à direita, a saída vai para a esquerda. Sem isso a animação seria
 * bonita mas não diria nada sobre onde o usuário está.
 *
 * `opacity` e `transform` são as duas propriedades aceitas pelo
 * `useNativeDriver`, então a animação roda na thread de UI e não engasga
 * enquanto o JS recalcula os agregados.
 */
export function AnaliseFinanceira({
  transacoes,
  saldo,
}: {
  transacoes: Transaction[];
  saldo: number;
}) {
  const [secao, setSecao] = useState<Secao>('mes');
  const [largura, setLargura] = useState(0);

  const [opacidade] = useState(() => new Animated.Value(1));
  const [deslocamento] = useState(() => new Animated.Value(0));

  // Só o agregado da seção visível: os três percorrem a lista inteira, e a cada
  // transação nova seriam recalculados mesmo sem aparecer.
  const dados = useMemo(() => {
    if (secao === 'mes') return { secao, porMes: agruparPorMes(transacoes) } as const;
    if (secao === 'tipo') return { secao, porTipo: agruparPorTipo(transacoes) } as const;
    return { secao, curva: evolucaoDoSaldo(transacoes, saldo) } as const;
  }, [secao, transacoes, saldo]);

  function trocarPara(destino: Secao) {
    if (destino === secao) return;

    const indiceAtual = SECOES.findIndex((s) => s.id === secao);
    const indiceDestino = SECOES.findIndex((s) => s.id === destino);
    const paraDireita = indiceDestino > indiceAtual;

    Animated.parallel([
      Animated.timing(opacidade, {
        toValue: 0,
        duration: DURACAO,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(deslocamento, {
        toValue: paraDireita ? -DESLOCAMENTO : DESLOCAMENTO,
        duration: DURACAO,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      // Sem esta guarda, uma troca interrompida por outro toque trocaria o
      // conteúdo com a animação pela metade.
      if (!finished) return;

      setSecao(destino);
      // A nova seção entra do lado oposto, completando o movimento.
      deslocamento.setValue(paraDireita ? DESLOCAMENTO : -DESLOCAMENTO);

      Animated.parallel([
        Animated.timing(opacidade, {
          toValue: 1,
          duration: DURACAO,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(deslocamento, {
          toValue: 0,
          duration: DURACAO,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }

  function medir(e: LayoutChangeEvent) {
    setLargura(e.nativeEvent.layout.width);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Análise financeira</Text>

      <View style={styles.abas}>
        {SECOES.map((s) => {
          const ativa = s.id === secao;
          return (
            <Pressable
              key={s.id}
              onPress={() => trocarPara(s.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativa }}
              style={[styles.aba, ativa && styles.abaAtiva]}
            >
              <Text style={[styles.abaTexto, ativa && styles.abaTextoAtivo]} numberOfLines={1}>
                {s.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.area} onLayout={medir}>
        <Animated.View
          style={{ opacity: opacidade, transform: [{ translateX: deslocamento }] }}
        >
          {largura > 0 && (
            <Suspense fallback={null}>
              {dados.secao === 'mes' && <EntradasSaidasChart dados={dados.porMes} largura={largura} />}
              {dados.secao === 'tipo' && <MovimentacaoPorTipoChart dados={dados.porTipo} />}
              {dados.secao === 'saldo' && <SaldoEvolucaoChart dados={dados.curva} largura={largura} />}
            </Suspense>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  titulo: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  // Abas em pílula, não sublinhadas como no web: num celular o alvo de toque
  // precisa de área, e a pílula deixa o estado ativo legível sem depender de
  // uma borda de 2px.
  abas: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  aba: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: Colors.borderLight,
  },
  abaAtiva: { backgroundColor: Colors.primary },
  abaTexto: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  abaTextoAtivo: { color: Colors.onPrimary },
  // Altura fixa evita que o card "pule" ao trocar de seção: os três gráficos
  // têm alturas naturais diferentes.
  area: { minHeight: 250, justifyContent: 'center' },
});
