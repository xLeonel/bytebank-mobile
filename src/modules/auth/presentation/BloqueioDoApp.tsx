import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { casosDeBloqueio } from '@/composition/container';
import { useAuth } from '@/modules/auth/presentation/AuthContext';
import { Button } from '@/shared/ui/Button';
import { Colors, FontSize, Spacing } from '@/shared/ui/theme';

/** Camada sobre o app: capa de privacidade fora de foco e tela de desbloqueio. */
export function BloqueioDoApp() {
  const { signOut } = useAuth();
  const bloqueado = useStore(casosDeBloqueio.store, (e) => e.bloqueado);
  const oculto = useStore(casosDeBloqueio.store, (e) => e.oculto);

  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'background') casosDeBloqueio.aoIrParaSegundoPlano(Date.now());
      else if (estado === 'inactive') casosDeBloqueio.aoPerderFoco();
      else void casosDeBloqueio.aoVoltar(Date.now());
    });
    return () => assinatura.remove();
  }, []);

  // Pede ao bloquear, sem esperar um toque. Só nessa transição: repetir ao cancelar
  // prenderia o usuário num ciclo, sem chance de chegar ao botão de sair.
  useEffect(() => {
    if (bloqueado) void casosDeBloqueio.desbloquear();
  }, [bloqueado]);

  if (!bloqueado && !oculto) return null;

  return (
    <View style={styles.camada} accessibilityViewIsModal>
      <Text style={styles.marca}>Bytebank</Text>

      {bloqueado && (
        <>
          <Ionicons name="lock-closed" size={40} color={Colors.warning} style={styles.icone} />
          <Text style={styles.mensagem}>Desbloqueie para ver sua conta.</Text>
          <View style={styles.botao}>
            <Button title="Desbloquear" onPress={() => void casosDeBloqueio.desbloquear()} />
          </View>
          <Pressable
            onPress={() => void signOut()}
            accessibilityRole="button"
            hitSlop={12}
            style={styles.sair}
          >
            <Text style={styles.sairTexto}>Sair da conta</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  camada: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.primary,
  },
  marca: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.warning },
  icone: { marginTop: Spacing.xl },
  mensagem: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.onPrimary,
    textAlign: 'center',
  },
  botao: { alignSelf: 'stretch', marginTop: Spacing.xl },
  sair: { marginTop: Spacing.lg },
  sairTexto: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.onPrimary },
});
