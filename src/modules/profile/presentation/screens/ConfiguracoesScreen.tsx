import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/shared/ui/Button';
import { confirmar } from '@/shared/ui/confirmar';
import { Colors, FontSize, Radius, Spacing } from '@/shared/ui/theme';
import { casosDePerfil } from '@/composition/container';
import { useAuth } from '@/modules/auth/presentation/AuthContext';

export default function ConfiguracoesScreen() {
  const { user, profile, signOut, atualizarPerfil } = useAuth();
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const iniciais = (profile?.name ?? user?.displayName ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  async function escolherFoto() {
    setErro(null);

    // Pede permissão só no momento do uso, não na abertura do app: o pedido
    // faz sentido para o usuário quando ele acabou de tocar em "alterar foto".
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro('Permissão de acesso às fotos negada.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      // Comprime antes de subir: a regra do Storage limita a 5 MB, e uma foto
      // de câmera moderna passa disso com folga.
      quality: 0.6,
    });
    if (resultado.canceled || !resultado.assets[0]) return;

    setEnviandoFoto(true);
    try {
      const url = await casosDePerfil.enviarFoto(user!.uid, resultado.assets[0].uri);
      await atualizarPerfil({ photoUrl: url });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviandoFoto(false);
    }
  }

  function confirmarSaida() {
    confirmar({
      titulo: 'Sair da conta',
      mensagem: 'Você precisará entrar novamente para acessar suas transações.',
      acao: 'Sair',
      aoConfirmar: () => void signOut(),
    });
  }

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.titulo}>Configurações</Text>

        <View style={styles.card}>
          <View style={styles.perfil}>
            <Pressable
              onPress={escolherFoto}
              disabled={enviandoFoto}
              accessibilityRole="button"
              accessibilityLabel="Alterar foto de perfil"
              style={styles.avatarArea}
            >
              {profile?.photoUrl ? (
                <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarVazio]}>
                  <Text style={styles.iniciais}>{iniciais}</Text>
                </View>
              )}

              <View style={styles.selo}>
                {enviandoFoto ? (
                  <ActivityIndicator size="small" color={Colors.onPrimary} />
                ) : (
                  <Ionicons name="camera" size={14} color={Colors.onPrimary} />
                )}
              </View>
            </Pressable>

            <View style={styles.identidade}>
              <Text style={styles.nome}>{profile?.name ?? user?.displayName ?? '—'}</Text>
              <Text style={styles.email}>{profile?.email ?? user?.email ?? '—'}</Text>
            </View>
          </View>

          {!!erro && (
            <Text style={styles.erro} accessibilityRole="alert">
              {erro}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.tituloCard}>Dados da conta</Text>
          <Linha rotulo="Tipo" valor="Conta Corrente" />
          <Linha rotulo="Agência" valor={profile?.agency ?? '—'} />
          <Linha rotulo="Conta" valor={profile?.bankAccount ?? '—'} />
        </View>

        <Button title="Sair da conta" onPress={confirmarSaida} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.linha}>
      <Text style={styles.linhaRotulo}>{rotulo}</Text>
      <Text style={styles.linhaValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Colors.background },
  conteudo: { padding: Spacing.md, gap: Spacing.md },
  titulo: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarArea: { width: 72, height: 72 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarVazio: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciais: { color: Colors.onPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  selo: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  identidade: { flex: 1 },
  nome: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  email: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  erro: { marginTop: Spacing.md, fontSize: FontSize.xs, color: Colors.error },
  tituloCard: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  linhaRotulo: { fontSize: FontSize.sm, color: Colors.textSecondary },
  linhaValor: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },
});
