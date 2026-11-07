import type { AvatarStorage } from '@/modules/profile/application/ports';
import { enviarArquivo } from '@/shared/infrastructure/fileStorage';

export const firebaseAvatarStorage: AvatarStorage = {
  enviar: (uid, uriLocal) => enviarArquivo(`users/${uid}/avatar.jpg`, uriLocal),
};
