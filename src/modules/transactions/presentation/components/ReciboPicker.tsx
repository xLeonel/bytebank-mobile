import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmar } from '@/shared/ui/confirmar';
import { Colors, FontSize, Radius, Spacing } from '@/shared/ui/theme';
import type { Attachment } from '@/modules/transactions/domain/types';

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
 * Seleção e visualização de recibo — câmera ou galeria.
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
  const [ampliada, setAmpliada] = useState<string | null>(null);

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
    confirmar({
      titulo: 'Remover recibo',
      mensagem: 'O arquivo será apagado permanentemente.',
      acao: 'Remover',
      aoConfirmar: () => void onRemover?.(anexo),
    });
  }

  /** Miniatura tocável — abre o comprovante em tela cheia. */
  function Miniatura({
    uri,
    rotulo,
    onExcluir,
  }: {
    uri: string;
    rotulo: string;
    onExcluir?: () => void;
  }) {
    return (
      <View style={styles.miniaturaArea}>
        <Pressable
          onPress={() => setAmpliada(uri)}
          accessibilityRole="imagebutton"
          accessibilityLabel={`Ampliar ${rotulo}`}
          style={({ pressed }) => pressed && styles.pressionado}
        >
          <Image source={{ uri }} style={styles.miniatura} />
          {/* Lupa sinalizando que a miniatura é tocável: sem ela, a única
              pista de que dá para ampliar seria descobrir por tentativa. */}
          <View style={styles.lupa}>
            <Ionicons name="expand-outline" size={12} color={Colors.onPrimary} />
          </View>
        </Pressable>

        {!!onExcluir && (
          <Pressable
            onPress={onExcluir}
            accessibilityRole="button"
            accessibilityLabel={`Remover ${rotulo}`}
            hitSlop={8}
            style={styles.remover}
          >
            <Ionicons name="close" size={14} color={Colors.onPrimary} />
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.rotulo}>Comprovante (opcional)</Text>

      {(anexos.length > 0 || !!uriPendente) && (
        <View style={styles.miniaturas}>
          {!!uriPendente && (
            <Miniatura
              uri={uriPendente}
              rotulo="comprovante selecionado"
              onExcluir={onRemoverPendente}
            />
          )}
          {anexos.map((anexo) => (
            <Miniatura
              key={anexo.path}
              uri={anexo.url}
              rotulo={`recibo ${anexo.name}`}
              onExcluir={onRemover ? () => confirmarRemocao(anexo) : undefined}
            />
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

      {/*
        Visualizador em tela cheia. `onRequestClose` cobre o botão físico de
        voltar no Android — sem ele o modal ficaria preso.
      */}
      <Modal
        visible={!!ampliada}
        transparent
        animationType="fade"
        onRequestClose={() => setAmpliada(null)}
      >
        <View style={styles.fundo}>
          <SafeAreaView style={styles.fundoSeguro} edges={['top', 'bottom']}>
            <Pressable
              onPress={() => setAmpliada(null)}
              accessibilityRole="button"
              accessibilityLabel="Fechar visualização"
              hitSlop={12}
              style={styles.fechar}
            >
              <Ionicons name="close" size={28} color={Colors.onPrimary} />
            </Pressable>

            {/*
              Tocar no fundo também fecha — é o gesto que as pessoas tentam
              primeiro. O toque na própria imagem não fecha, para não atrapalhar
              quem está examinando o comprovante.
            */}
            <Pressable style={styles.areaImagem} onPress={() => setAmpliada(null)}>
              {!!ampliada && (
                <Image
                  source={{ uri: ampliada }}
                  style={styles.imagemAmpliada}
                  // contain para o comprovante caber inteiro: cortar justamente
                  // a parte com o valor derrotaria o propósito de ampliar.
                  resizeMode="contain"
                  accessibilityLabel="Comprovante ampliado"
                />
              )}
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rotulo: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  miniaturas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  miniaturaArea: { width: 72, height: 72 },
  miniatura: { width: 72, height: 72, borderRadius: Radius.md, backgroundColor: Colors.borderLight },
  lupa: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  fundo: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.92)' },
  fundoSeguro: { flex: 1 },
  fechar: { alignSelf: 'flex-end', padding: Spacing.md },
  areaImagem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imagemAmpliada: { width: '100%', height: '100%' },
});
