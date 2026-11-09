import { doc, getDoc, setDoc } from 'firebase/firestore';

import type { ProfileRepository } from '@/modules/profile/application/ports';
import type { UserProfile } from '@/modules/profile/domain/profile';
import { db } from '@/shared/infrastructure/firebase';

export const firestoreProfileRepository: ProfileRepository = {
  async buscar(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  },

  async salvar(uid, perfil) {
    await setDoc(doc(db, 'users', uid), perfil);
  },

  async mesclar(uid, dados) {
    await setDoc(doc(db, 'users', uid), dados, { merge: true });
  },
};
