import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import type { AutenticadorLocal } from '@/modules/auth/application/ports';

export const expoAutenticadorLocal: AutenticadorLocal = {
  /**
   * Vale qualquer trava do aparelho, não só biometria: quem usa apenas senha também
   * fica protegido. Sem nenhuma, não há como desbloquear, então não se bloqueia.
   */
  async disponivel() {
    if (Platform.OS === 'web') return false;
    try {
      const nivel = await LocalAuthentication.getEnrolledLevelAsync();
      return nivel !== LocalAuthentication.SecurityLevel.NONE;
    } catch {
      return false;
    }
  },

  async autenticar(motivo) {
    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: motivo,
      cancelLabel: 'Cancelar',
    });
    return resultado.success;
  },
};
