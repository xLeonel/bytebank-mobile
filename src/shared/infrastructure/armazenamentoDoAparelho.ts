import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { criarArmazenamentoCriptografado, criarObtencaoDeChave } from './armazenamentoCriptografado';

const ITEM_DA_CHAVE = 'bytebank.chave-de-armazenamento';

// Só disponível com o aparelho desbloqueado, e sem ir para backups nem migrar para
// outro aparelho: lá, a sessão simplesmente não abre e o usuário entra de novo.
const OPCOES_DO_COFRE: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/** Armazenamento criptografado do aparelho. Não existe no web: lá não há cofre. */
export const armazenamentoDoAparelho = criarArmazenamentoCriptografado({
  base: AsyncStorage,
  gerarBytes: getRandomBytes,
  obterChave: criarObtencaoDeChave(
    {
      ler: () => SecureStore.getItemAsync(ITEM_DA_CHAVE, OPCOES_DO_COFRE),
      gravar: (chave) => SecureStore.setItemAsync(ITEM_DA_CHAVE, chave, OPCOES_DO_COFRE),
    },
    getRandomBytes,
  ),
});
