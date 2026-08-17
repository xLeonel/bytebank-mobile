# Bytebank Mobile

App do Tech Challenge Fase 3 — React Native + Expo + Firebase.

## Expo

Projeto no **SDK 56**. Consulte a documentação versionada:
https://docs.expo.dev/versions/v56.0.0/

> O scaffold nasceu no SDK 57, recém-promovido a estável, mas o Expo Go das
> lojas ainda acompanha o 56 — abrir o projeto no celular falhava com "Project
> is incompatible with this version of Expo Go". Não atualize o SDK sem antes
> confirmar que o Expo Go instalado já suporta a versão nova.

## Convenções

- Commits **sem** trailer `Co-Authored-By`.
- Comentários e mensagens de commit em português.
- Regras de negócio ficam em `src/domain/` — TypeScript puro, sem React e sem
  Firebase, testável com `npx tsx src/domain/domain.test.ts`.
- `type` de transação guarda o valor canônico (`saque`/`deposito`/`pix`); o
  rótulo exibido é derivado em `TYPE_LABEL`. Não guarde rótulo no dado.

## Firebase

- Auth vem de `@firebase/auth`, **não** de `firebase/auth`: o guarda-chuva não
  declara a condição de export `react-native` e entrega o build de browser, que
  não contém `getReactNativePersistence`.
- `getAnalytics` não funciona em React Native.
- Configuração em `.env.local` (ver `.env.example`).
- Regras em `firestore.rules` e `storage.rules`; publicar com
  `npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage`.
