import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { traduzirErroAuth, useAuth } from '@/contexts/AuthContext';
import { validateRequired } from '@/domain/validation';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleEntrar() {
    const emailCheck = validateRequired(email, 'E-mail');
    const senhaCheck = validateRequired(senha, 'Senha');
    setErros({ email: emailCheck.message, senha: senhaCheck.message });
    setErroGeral(null);
    if (!emailCheck.valid || !senhaCheck.valid) return;

    setEnviando(true);
    try {
      await signIn(email, senha);
      // Sem navegação aqui: o guard em _layout reage ao onAuthStateChanged.
    } catch (e) {
      setErroGeral(traduzirErroAuth((e as { code?: string })?.code ?? ''));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.tela}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.marca}>
          <Text style={styles.logo}>Bytebank</Text>
          <Text style={styles.subtitulo}>Suas finanças, no seu bolso.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.titulo}>Entrar</Text>

          <Input
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={erros.email}
          />
          <Input
            label="Senha"
            value={senha}
            onChangeText={setSenha}
            placeholder="Digite sua senha"
            secureTextEntry
            autoComplete="current-password"
            error={erros.senha}
          />

          {!!erroGeral && (
            <Text style={styles.erroGeral} accessibilityRole="alert">
              {erroGeral}
            </Text>
          )}

          <Button title="Entrar" onPress={handleEntrar} loading={enviando} />

          <View style={styles.rodape}>
            <Text style={styles.rodapeTexto}>Ainda não tem conta? </Text>
            <Link href="/(auth)/cadastro" style={styles.rodapeLink}>
              Criar conta
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  marca: { alignItems: 'center', marginBottom: Spacing.xl },
  logo: { fontSize: FontSize.hero, fontWeight: '800', color: Colors.warning },
  subtitulo: { marginTop: Spacing.xs, fontSize: FontSize.sm, color: Colors.onPrimary, opacity: 0.85 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  titulo: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  erroGeral: {
    color: Colors.error,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  rodape: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md },
  rodapeTexto: { color: Colors.textSecondary, fontSize: FontSize.sm },
  rodapeLink: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
});
