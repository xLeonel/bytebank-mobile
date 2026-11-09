import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { Colors, FontSize, Layout, Radius, Spacing } from '@/shared/ui/theme';

type TipoDeAviso = 'sucesso' | 'atencao';

type Aviso = { id: number; mensagem: string; tipo: TipoDeAviso };

const TEMPO_NA_TELA = 3000;
const DURACAO_DA_ANIMACAO = 180;

const avisos = createStore<{ atual: Aviso | null }>(() => ({ atual: null }));
let proximoId = 0;

/**
 * Confirma o resultado de uma ação depois que a tela já mudou.
 *
 * Salvar ou excluir leva o usuário de volta à tela anterior; uma mensagem dentro
 * do formulário sumiria junto com ele. O aviso vive acima da navegação e aparece
 * na tela de destino.
 */
export function avisar(mensagem: string, tipo: TipoDeAviso = 'sucesso') {
  avisos.setState({ atual: { id: ++proximoId, mensagem, tipo } });
}

/** Exibe o aviso atual. Fica uma vez só, na raiz do app. */
export function AvisoNaTela() {
  const aviso = useStore(avisos, (e) => e.atual);
  const insets = useSafeAreaInsets();
  const [entrada] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!aviso) return;

    // O aviso é visual; sem isto, quem usa leitor de tela não saberia do resultado.
    AccessibilityInfo.announceForAccessibility(aviso.mensagem);
    entrada.setValue(0);
    Animated.timing(entrada, {
      toValue: 1,
      duration: DURACAO_DA_ANIMACAO,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    const temporizador = setTimeout(() => {
      Animated.timing(entrada, {
        toValue: 0,
        duration: DURACAO_DA_ANIMACAO,
        useNativeDriver: true,
      }).start(({ finished }) => {
        // Um aviso novo pode ter chegado durante a saída; só este é apagado.
        if (finished && avisos.getState().atual?.id === aviso.id) avisos.setState({ atual: null });
      });
    }, TEMPO_NA_TELA);

    return () => clearTimeout(temporizador);
  }, [aviso, entrada]);

  if (!aviso) return null;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.aviso,
        aviso.tipo === 'atencao' && styles.atencao,
        {
          // Acima da barra de abas, para não cobrir a navegação.
          bottom: insets.bottom + Layout.alturaDaBarraDeAbas + Spacing.md,
          opacity: entrada,
          transform: [
            { translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          ],
        },
      ]}
    >
      <Ionicons
        name={aviso.tipo === 'sucesso' ? 'checkmark-circle' : 'alert-circle'}
        size={20}
        color={aviso.tipo === 'sucesso' ? Colors.onPrimary : Colors.text}
      />
      <Text style={[styles.texto, aviso.tipo === 'atencao' && styles.textoAtencao]}>
        {aviso.mensagem}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    // Toques passam para a tela: o aviso some sozinho e não deve bloquear nada.
    pointerEvents: 'none',
  },
  atencao: { backgroundColor: Colors.warning },
  texto: { flex: 1, fontSize: FontSize.sm, fontWeight: '600', color: Colors.onPrimary },
  textoAtencao: { color: Colors.text },
});
