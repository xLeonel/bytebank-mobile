import type { ReceiptStorage } from '@/modules/transactions/application/ports';
import { enviarArquivo, removerArquivo, urlDoArquivo } from '@/shared/infrastructure/fileStorage';

export const firebaseReceiptStorage: ReceiptStorage = {
  async enviar(uid, txId, uriLocal, nomeArquivo) {
    const path = `users/${uid}/receipts/${txId}/${nomeArquivo}`;
    await enviarArquivo(path, uriLocal);
    return path;
  },
  obterUrl: urlDoArquivo,
  remover: removerArquivo,
};
