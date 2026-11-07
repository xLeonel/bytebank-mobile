import { Alert, Platform } from 'react-native';

type Opcoes = {
  titulo: string;
  mensagem: string;
  /** Rótulo do botão que confirma. */
  acao: string;
  aoConfirmar: () => void;
};

/**
 * Pede confirmação antes de uma ação destrutiva.
 *
 * O `Alert.alert` do React Native Web não faz nada: sem este desvio, os botões
 * de excluir e de sair ficariam mudos no navegador.
 */
export function confirmar({ titulo, mensagem, acao, aoConfirmar }: Opcoes) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n\n${mensagem}`)) aoConfirmar();
    return;
  }

  Alert.alert(titulo, mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: acao, style: 'destructive', onPress: aoConfirmar },
  ]);
}
