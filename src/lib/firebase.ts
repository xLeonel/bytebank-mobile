import AsyncStorage from '@react-native-async-storage/async-storage';
/**
 * Auth vem de `@firebase/auth`, não do guarda-chuva `firebase/auth`.
 *
 * O `exports` de `firebase/auth` não declara a condição "react-native", então
 * tanto o Metro quanto o tsc caem no build de browser — que **não contém**
 * `getReactNativePersistence` (verificado: 0 ocorrências no bundle ESM, 8 no
 * build RN). Usar o guarda-chuva aqui quebraria em runtime no dispositivo, não
 * só na checagem de tipos. `@firebase/auth` declara a condição e entrega o
 * build certo; está no package.json como dependência direta para a resolução
 * não depender de hoisting transitivo.
 */
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from '@firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

/**
 * Inicialização do Firebase.
 *
 * Nada de `getAnalytics` aqui: o módulo de Analytics do SDK web depende de APIs
 * de browser e quebra o bundle em React Native.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const faltando = Object.entries(firebaseConfig)
  .filter(([, valor]) => !valor)
  .map(([chave]) => chave);

if (faltando.length) {
  // Falhar aqui, no boot, é melhor que um erro obscuro de "permission denied"
  // na primeira query. Ver .env.example.
  throw new Error(
    `Configuração do Firebase incompleta: ${faltando.join(', ')}. ` +
      'Copie .env.example para .env.local e preencha os valores do seu projeto.',
  );
}

// getApps() evita reinicializar no Fast Refresh, que lançaria "app already exists".
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * `initializeAuth` com persistência explícita em AsyncStorage.
 *
 * Sem isto o `getAuth()` padrão usa memória em React Native e o usuário é
 * deslogado a cada vez que o app é fechado — o SDK só avisa com um warning
 * discreto no console, então é uma falha fácil de não perceber em dev.
 */
/**
 * No web (`expo start --web`) a condição de export "react-native" não se
 * aplica, então `getReactNativePersistence` não existe e o SDK já persiste
 * sozinho em IndexedDB/localStorage. Tratar isso explicitamente evita que a
 * ausência da função caia no `catch` abaixo, que existe para outro motivo.
 */
let auth: Auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Já inicializado (Fast Refresh): reaproveita a instância existente em vez
    // de estourar "auth/already-initialized".
    auth = getAuth(app);
  }
}

export { app, auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
