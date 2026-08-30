import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

type Props<T extends string> = {
  label: string;
  opcoes: readonly T[];
  selecionado: T | null;
  onSelecionar: (valor: T | null) => void;
  /** Texto do estado "nada selecionado" — e da opção que limpa a seleção. */
  rotuloVazio?: string;
  error?: string;
};

/**
 * Campo de seleção que abre a lista completa numa folha inferior.
 *
 * Usado onde há muitas opções (as 11 categorias). Chips em grade tomariam
 * quatro linhas e empurrariam o conteúdo da tela; chips em faixa rolável
 * escondem as opções atrás de um gesto horizontal que ainda briga com a
 * rolagem vertical. Um campo fechado mostra a escolha atual em uma linha, e a
 * lista aberta mostra todas as opções de uma vez, roláveis na vertical — que é
 * o gesto natural numa lista.
 */
export function Select<T extends string>({
  label,
  opcoes,
  selecionado,
  onSelecionar,
  rotuloVazio = 'Todas',
  error,
}: Props<T>) {
  const [aberto, setAberto] = useState(false);

  function escolher(valor: T | null) {
    onSelecionar(valor);
    setAberto(false);
  }

  return (
    <View>
      <Text style={styles.rotulo}>{label}</Text>

      <Pressable
        onPress={() => setAberto(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selecionado ?? rotuloVazio}. Toque para alterar.`}
        style={({ pressed }) => [
          styles.campo,
          !!error && styles.campoComErro,
          pressed && styles.pressionado,
        ]}
      >
        <Text style={[styles.valor, !selecionado && styles.valorVazio]}>
          {selecionado ?? rotuloVazio}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
      </Pressable>

      {!!error && (
        <Text style={styles.erro} accessibilityRole="alert">
          {error}
        </Text>
      )}

      <Modal
        visible={aberto}
        transparent
        animationType="slide"
        // Cobre o botão físico de voltar no Android; sem isso a folha ficaria presa.
        onRequestClose={() => setAberto(false)}
      >
        <Pressable style={styles.fundo} onPress={() => setAberto(false)}>
          {/*
            O toque só fecha no fundo. Este Pressable interno intercepta o
            toque na folha para ela não fechar quando o usuário rola a lista.
          */}
          <Pressable style={styles.folha} onPress={() => {}}>
            <SafeAreaView edges={['bottom']}>
              <View style={styles.cabecalho}>
                <Text style={styles.tituloFolha}>{label}</Text>
                <Pressable
                  onPress={() => setAberto(false)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar"
                >
                  <Ionicons name="close" size={24} color={Colors.textSecondary} />
                </Pressable>
              </View>

              <FlatList
                data={[null, ...opcoes] as (T | null)[]}
                keyExtractor={(item) => item ?? '__vazio__'}
                style={styles.lista}
                renderItem={({ item }) => {
                  const ativo = item === selecionado;
                  return (
                    <Pressable
                      onPress={() => escolher(item)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: ativo }}
                      style={({ pressed }) => [styles.opcao, pressed && styles.pressionado]}
                    >
                      <Text style={[styles.opcaoTexto, ativo && styles.opcaoAtiva]}>
                        {item ?? rotuloVazio}
                      </Text>
                      {ativo && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                    </Pressable>
                  );
                }}
              />
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rotulo: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  campo: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
  },
  campoComErro: { borderColor: Colors.error },
  pressionado: { opacity: 0.7 },
  valor: { fontSize: FontSize.md, color: Colors.text },
  valorVazio: { color: Colors.textMuted },
  erro: { marginTop: Spacing.xs, fontSize: FontSize.xs, color: Colors.error },
  fundo: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  folha: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    // Teto de altura: a folha não deve cobrir a tela inteira, senão perde a
    // referência de onde o usuário estava.
    maxHeight: '70%',
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tituloFolha: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  lista: { paddingHorizontal: Spacing.lg },
  opcao: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  opcaoTexto: { fontSize: FontSize.md, color: Colors.text },
  opcaoAtiva: { color: Colors.primary, fontWeight: '700' },
});
