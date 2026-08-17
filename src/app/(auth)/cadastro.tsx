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

type Erros = { nome?: string; email?: string; senha?: string; confirmacao?: string };

export default function CadastroScreen() {
  const { signUp } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function validar(): boolean {
    const proximos: Erros = {
      nome: validateRequired(nome, 'Nome').message,
      email: validateRequired(email, 'E-mail').message,
    };
    // O Firebase também recusa senha curta, mas validar aqui evita uma ida à
    // rede e dá a mensagem no campo certo em vez de um erro geral.
    if (senha.length < 6) proximos.senha = 'A senha precisa ter ao menos 6 caracteres.';
    if (senha !== confirmacao) proximos.confirmacao = 'As senhas não conferem.';

    setErros(proximos);
    return !Object.values(proximos).some(Boolean);
  }

  async function handleCriar() {
    setErroGeral(null);
    if (!validar()) return;

    setEnviando(true);
    try {
      await signUp(nome, email, senha);
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
        <View style={styles.card}>
          <Text style={styles.titulo}>Criar conta</Text>
          <Text style={styles.ajuda}>
            Sua agência e número de conta são gerados automaticamente.
          </Text>

          <Input
            label="Nome"
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome"
            autoCapitalize="words"
            error={erros.nome}
          />
          <Input
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={erros.email}
          />
          <Input
            label="Senha"
            value={senha}
            onChangeText={setSenha}
            placeholder="Mínimo de 6 caracteres"
            secureTextEntry
            error={erros.senha}
          />
          <Input
            label="Confirmar senha"
            value={confirmacao}
            onChangeText={setConfirmacao}
            placeholder="Repita a senha"
            secureTextEntry
            error={erros.confirmacao}
          />

          {!!erroGeral && (
            <Text style={styles.erroGeral} accessibilityRole="alert">
              {erroGeral}
            </Text>
          )}

          <Button title="Criar conta" onPress={handleCriar} loading={enviando} />

          <View style={styles.rodape}>
            <Text style={styles.rodapeTexto}>Já tem conta? </Text>
            <Link href="/(auth)/login" style={styles.rodapeLink}>
              Entrar
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
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  titulo: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  ajuda: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
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
