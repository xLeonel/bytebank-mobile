import type { AvatarStorage } from '@/modules/profile/application/ports';
import { enviarArquivo, urlDoArquivo } from '@/shared/infrastructure/fileStorage';

export const firebaseAvatarStorage: AvatarStorage = {
  async enviar(uid, uriLocal) {
    const caminho = `users/${uid}/avatar.jpg`;
    await enviarArquivo(caminho, uriLocal);
    return urlDoArquivo(caminho);
  },
};
