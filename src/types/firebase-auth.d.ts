import type { Persistence } from '@firebase/auth';

/**
 * Declara `getReactNativePersistence`, que existe no build React Native do
 * `@firebase/auth` mas não aparece nos tipos.
 *
 * Causa: no campo `exports` do pacote, a chave `"types"` vem **antes** da
 * condição `"react-native"`. O TypeScript casa com a primeira e resolve os
 * tipos do build de browser, onde a função não existe. Em runtime não há
 * condição `"types"`, então o Metro casa com `"react-native"` e carrega
 * `dist/rn/index.js`, que exporta a função normalmente.
 *
 * Portanto isto é só um acerto de tipagem — não um `any` para contornar código
 * quebrado. A assinatura reflete a real: recebe o AsyncStorage e devolve uma
 * `Persistence` para passar ao `initializeAuth`.
 *
 * Pode ser removido quando o Firebase reordenar as condições do `exports`.
 */
declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
