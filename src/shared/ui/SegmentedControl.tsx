import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/shared/ui/theme';

const DURACAO = 180;

export type OpcaoDeSegmento<T> = { valor: T; rotulo: string };

type Props<T> = {
  opcoes: readonly OpcaoDeSegmento<T>[];
  selecionado: T;
  onSelecionar: (valor: T) => void;
  /** Lido por leitores de tela; o rótulo visível, quando há, fica com a tela. */
  rotulo: string;
};

/**
 * Escolha única entre poucas opções curtas, todas visíveis em uma linha.
 *
 * Para conjuntos longos (as 11 categorias), use `Select`: aqui os segmentos
 * ficariam estreitos demais para o texto e para o toque.
 *
 * O marcador é uma camada só, que desliza entre as opções em vez de trocar a cor
 * de cada uma. `transform` roda no driver nativo, então o movimento não depende
 * de a thread do JS estar livre enquanto a tela busca os dados do novo filtro.
 */
export function SegmentedControl<T extends string | null>({
  opcoes,
  selecionado,
  onSelecionar,
  rotulo,
}: Props<T>) {
  const [largura, setLargura] = useState(0);
  const [posicao] = useState(() => new Animated.Value(0));
  const jaPosicionado = useRef(false);

  const larguraDoSegmento = largura / opcoes.length;
  const indice = opcoes.findIndex((o) => o.valor === selecionado);

  useEffect(() => {
    if (!larguraDoSegmento) return;
    const destino = indice * larguraDoSegmento;

    // A primeira medição só posiciona: animar aqui faria o marcador atravessar
    // o controle toda vez que a tela abre.
    if (!jaPosicionado.current) {
      jaPosicionado.current = true;
      posicao.setValue(destino);
      return;
    }

    Animated.timing(posicao, {
      toValue: destino,
      duration: DURACAO,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [indice, larguraDoSegmento, posicao]);

  return (
    <View style={styles.trilho} accessibilityRole="radiogroup" accessibilityLabel={rotulo}>
      <View style={styles.area} onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
        {largura > 0 && (
          <Animated.View
            style={[
              styles.marcador,
              { width: larguraDoSegmento, transform: [{ translateX: posicao }] },
            ]}
          />
        )}

        {opcoes.map((opcao) => {
          const ativo = opcao.valor === selecionado;
          return (
            <Pressable
              key={String(opcao.valor)}
              onPress={() => onSelecionar(opcao.valor)}
              accessibilityRole="radio"
              // `aria-checked` faz o leitor de tela anunciar a opção ativa nas três
              // plataformas; `accessibilityState` não chega ao DOM no web.
              aria-checked={ativo}
              accessibilityLabel={opcao.rotulo}
              style={styles.segmento}
            >
              <Text style={[styles.texto, ativo && styles.textoAtivo]} numberOfLines={1}>
                {opcao.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: {
    padding: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.borderLight,
  },
  area: { flexDirection: 'row' },
  marcador: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
  },
  segmento: {
    flex: 1,
    minHeight: 40, // alvo de toque confortável
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  texto: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },
  textoAtivo: { color: Colors.onPrimary },
});
