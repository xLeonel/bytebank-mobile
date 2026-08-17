# Bytebank Mobile

App do Tech Challenge Fase 3 — React Native + Expo + Firebase.

## Expo

Projeto no **SDK 54**. Consulte a documentação versionada:
https://docs.expo.dev/versions/v54.0.0/

> **Não atualize o SDK sem confirmar o Expo Go antes.** O scaffold nasceu no 57
> e falhava no celular com "Project is incompatible with this version of Expo
> Go" — o Expo Go da App Store estava no 54, porque versões mais novas exigem um
> iOS mais recente que o do aparelho. O SDK aqui é ditado pelo Expo Go, não pelo
> `latest` do npm. Para usar SDK novo seria preciso um development build (EAS).
>
> Ao trocar de SDK: apague `node_modules` e o lockfile antes de reinstalar.
> Descer versões deixa pacotes órfãos (foi `react-server-dom-webpack` exigindo
> um React mais novo) que travam o `npm install` com conflito de peer.
>
> `expo install --fix` pode injetar config plugins em `app.json` que não existem
> no SDK alvo (`expo-image` e `expo-status-bar` não têm `app.plugin.js` no 54).
> Isso não aparece no `tsc`, só quebra no `expo export`.

## Convenções

- Commits **sem** trailer `Co-Authored-By`.
- Comentários e mensagens de commit em português.
- Regras de negócio ficam em `src/domain/` — TypeScript puro, sem React e sem
  Firebase, testável com `npx tsx src/domain/domain.test.ts`.
- `type` de transação guarda o valor canônico (`saque`/`deposito`/`pix`); o
  rótulo exibido é derivado em `TYPE_LABEL`. Não guarde rótulo no dado.
- `SafeAreaView` vem de `react-native-safe-area-context`, não de `react-native`.

## Firebase

- Auth vem de `@firebase/auth`, **não** de `firebase/auth`: o guarda-chuva não
  declara a condição de export `react-native` e entrega o build de browser, que
  não contém `getReactNativePersistence`.
- `getAnalytics` não funciona em React Native.
- Configuração em `.env.local` (ver `.env.example`).
- Regras em `firestore.rules` e `storage.rules`; publicar com
  `npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage`.

## Verificação

Antes de considerar uma mudança pronta:

```
npx tsc --noEmit                    # tipos
npx tsx src/domain/domain.test.ts   # regras de negócio
npx expo export --platform android  # resolução de módulos e config plugins
```

O `expo export` pega o que o `tsc` não vê: config plugin inválido e módulo que
o Metro resolve para o build errado.
