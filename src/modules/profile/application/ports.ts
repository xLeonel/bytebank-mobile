import type { UserProfile } from '@/modules/profile/domain/profile';

export type ProfileRepository = {
  buscar: (uid: string) => Promise<UserProfile | null>;
  salvar: (uid: string, perfil: UserProfile) => Promise<void>;
  /** Grava só os campos informados, sem apagar os demais. */
  mesclar: (uid: string, dados: Partial<UserProfile>) => Promise<void>;
};

export type AvatarStorage = {
  /** Envia a foto e devolve a URL para exibi-la. */
  enviar: (uid: string, uriLocal: string) => Promise<string>;
};
