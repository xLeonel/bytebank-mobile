import type { ReceiptStorage } from '@/modules/transactions/application/ports';
import { enviarArquivo, removerArquivo } from '@/shared/infrastructure/fileStorage';

export const firebaseReceiptStorage: ReceiptStorage = {
  async enviar(uid, txId, uriLocal, nomeArquivo) {
    const path = `users/${uid}/receipts/${txId}/${nomeArquivo}`;
    const url = await enviarArquivo(path, uriLocal);
    return { path, url };
  },
  remover: removerArquivo,
};
