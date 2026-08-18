import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Attachment } from '@/domain/types';

type Props = {
  anexos: Attachment[];
  /** Recebe a URI local escolhida; o envio ao Storage é do chamador. */
  onEscolher: (uri: string) => Promise<void> | void;
  onRemover?: (anexo: Attachment) => Promise<void> | void;
  enviando?: boolean;
  desabilitado?: boolean;
  /**
   * Preview de um arquivo escolhido antes de a transação existir. No cadastro
   * o upload só pode acontecer depois do create, porque o caminho no bucket
   * inclui o id da transação — até lá a imagem vive só como URI local.
   */
  uriPendente?: string | null;
  onRemoverPendente?: () => void;
};

/**
 * Seleção de recibo — câmera ou galeria.
 *
 * Oferece a câmera junto da galeria porque o caso real é fotografar o
 * comprovante na hora; obrigar a fotografar antes, sair do app e voltar seria
 * um passo a mais sem motivo.
 */
export function ReciboPicker({
  anexos,
  onEscolher,
  onRemover,
  enviando,
  desabilitado,
  uriPendente,
  onRemoverPendente,
}: Props) {
  const [erro, setErro] = useState<string | null>(null);

  async function abrirGaleria() {
    setErro(null);
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro('Permissão de acesso às fotos negada.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      // Comprime antes de subir: a regra do Storage limita a 5 MB e foto de
      // câmera moderna passa disso com folga.
      quality: 0.6,
    });
    if (!r.canceled && r.assets[0]) await onEscolher(r.assets[0].uri);
  }

  async function abrirCamera() {
    setErro(null);
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      setErro('Permissão de acesso à câmera negada.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!r.canceled && r.assets[0]) await onEscolher(r.assets[0].uri);
  }

  function confirmarRemocao(anexo: Attachment) {
    Alert.alert('Remover recibo', 'O arquivo será apagado permanentemente.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => void onRemover?.(anexo) },
    ]);
  }

  return (
    <View>
      <Text style={styles.rotulo}>Comprovante (opcional)</Text>

      {(anexos.length > 0 || !!uriPendente) && (
        <View style={styles.miniaturas}>
          {!!uriPendente && (
            <View style={styles.miniaturaArea}>
              <Image source={{ uri: uriPendente }} style={styles.miniatura} />
              {!!onRemoverPendente && (
                <Pressable
                  onPress={onRemoverPendente}
                  accessibilityRole="button"
                  accessibilityLabel="Remover comprovante selecionado"
                  hitSlop={8}
                  style={styles.remover}
                >
                  <Ionicons name="close" size={14} color={Colors.onPrimary} />
                </Pressable>
              )}
            </View>
          )}
          {anexos.map((anexo) => (
            <View key={anexo.path} style={styles.miniaturaArea}>
              <Image source={{ uri: anexo.url }} style={styles.miniatura} />
              {!!onRemover && (
                <Pressable
                  onPress={() => confirmarRemocao(anexo)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover recibo ${anexo.name}`}
                  hitSlop={8}
                  style={styles.remover}
                >
                  <Ionicons name="close" size={14} color={Colors.onPrimary} />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.botoes}>
        <Pressable
          onPress={abrirCamera}
          disabled={desabilitado || enviando}
          accessibilityRole="button"
          accessibilityLabel="Fotografar comprovante"
          style={({ pressed }) => [styles.botao, pressed && styles.pressionado]}
        >
          <Ionicons name="camera-outline" size={18} color={Colors.primary} />
          <Text style={styles.botaoTexto}>Fotografar</Text>
        </Pressable>

        <Pressable
          onPress={abrirGaleria}
          disabled={desabilitado || enviando}
          accessibilityRole="button"
          accessibilityLabel="Escolher comprovante da galeria"
          style={({ pressed }) => [styles.botao, pressed && styles.pressionado]}
        >
          <Ionicons name="image-outline" size={18} color={Colors.primary} />
          <Text style={styles.botaoTexto}>Galeria</Text>
        </Pressable>

        {enviando && <ActivityIndicator color={Colors.primary} />}
      </View>

      {desabilitado && (
        <Text style={styles.ajuda}>
          O comprovante pode ser anexado depois de salvar a transação.
        </Text>
      )}
      {!!erro && (
        <Text style={styles.erro} accessibilityRole="alert">
          {erro}
        </Text>
      )}
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
  miniaturas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  miniaturaArea: { width: 72, height: 72 },
  miniatura: { width: 72, height: 72, borderRadius: Radius.md, backgroundColor: Colors.borderLight },
  remover: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botoes: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressionado: { opacity: 0.6 },
  botaoTexto: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  ajuda: { marginTop: Spacing.xs, fontSize: FontSize.xs, color: Colors.textMuted },
  erro: { marginTop: Spacing.xs, fontSize: FontSize.xs, color: Colors.error },
});
