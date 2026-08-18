# Bytebank Mobile

Aplicação de gerenciamento financeiro em **React Native + Expo**, com **Firebase**
como backend (Authentication, Cloud Firestore e Cloud Storage).

Tech Challenge — Fase 3 (FIAP Pós Tech).

---

## O que o app faz

| Tela | Recursos |
|---|---|
| **Login / Cadastro** | Autenticação por e-mail e senha, com sessão persistida entre aberturas |
| **Início** | Saldo, dados da conta, análise financeira com gráficos e transições animadas, e as últimas transações |
| **Nova transação** | Depósito, Saque e Transferência Pix, com validação de campos e upload de comprovante |
| **Extrato** | Filtros por tipo e categoria, com scroll infinito paginado no Firestore |
| **Ajustes** | Foto de perfil, dados da conta e saída da sessão |

---

## Pré-requisitos

- **Node.js 20+**
- **Expo Go** no celular — [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) · [iOS](https://apps.apple.com/app/expo-go/id982107779)
- Uma conta Google para criar o projeto Firebase

> **Atenção à versão do Expo Go.** Este projeto está no **SDK 54** porque é o que
> o Expo Go das lojas suportava no momento do desenvolvimento. Quem dita o SDK é
> o Expo Go instalado, não o `latest` do npm: abrir um projeto mais novo falha
> com *"Project is incompatible with this version of Expo Go"*. Para usar um SDK
> mais recente seria preciso gerar um development build (EAS).

---

## Configuração do Firebase

### 1. Criar o projeto

1. Acesse o [console do Firebase](https://console.firebase.google.com) e crie um projeto.
2. Em **Build → Authentication → Sign-in method**, habilite **E-mail/senha**.
3. Em **Build → Firestore Database**, crie o banco. Região sugerida: `southamerica-east1`.
4. Em **Build → Storage**, clique em **Get Started**.

> O Cloud Storage exige o plano **Blaze** em projetos novos. Ele inclui a mesma
> cota gratuita do Spark (≈5 GB armazenados) e só cobra o excedente — o uso deste
> app fica dentro da cota. Ainda assim, crie um **orçamento com alerta** em
> *Google Cloud Console → Billing → Budgets & alerts*.

### 2. Registrar o app

Em **Project settings → Your apps**, registre um app do tipo **Web** (`</>`).

> Registre **Web** mesmo rodando em Android/iOS. Este projeto usa o Firebase JS
> SDK, que funciona no Expo Go; app Android/iOS nativo só seria necessário com
> `@react-native-firebase`, que exige development build.

Copie o objeto `firebaseConfig` exibido.

### 3. Preencher as variáveis

```bash
cp .env.example .env.local
```

Preencha `.env.local` com os valores do `firebaseConfig`:

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

> O prefixo `EXPO_PUBLIC_` embute o valor no bundle, e isso é esperado: chaves do
> SDK cliente do Firebase **não são segredo** — quem protege os dados são as
> Security Rules. O `.env.local` fica fora do git apenas para o repositório não
> ficar preso a um projeto específico.

### 4. Publicar as regras de segurança

**Passo obrigatório.** Sem ele o banco fica em modo padrão e o app falha com
`Missing or insufficient permissions`.

```bash
npx firebase-tools login
```

```bash
npx firebase-tools use SEU_PROJECT_ID
```

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage
```

Isso publica:

- `firestore.rules` — cada usuário lê e escreve apenas sob `users/{uid}`
- `firestore.indexes.json` — índices compostos dos filtros do extrato
- `storage.rules` — recibos e foto de perfil restritos ao dono, com limite de 5 MB

> Os índices levam alguns minutos para construir. Enquanto isso, filtrar o
> extrato pode falhar com um erro que traz um link direto para criar o índice.

---

## Rodando

```bash
npm install
```

```bash
npx expo start
```

Escaneie o QR com o Expo Go. Celular e computador precisam estar na mesma rede.

> Se o projeto não aparecer na lista do Expo Go, use **"Enter URL manually"** com
> o endereço `exp://SEU_IP_LOCAL:8081`. A lista mostra apenas projetos da conta
> Expo logada no CLI, e o login não é necessário para rodar em rede local.

### Dados de demonstração

Popula o Firestore com um usuário demo e 48 transações distribuídas em 8 meses:

```bash
npm run seed
```

Login: **demo@bytebank.com** · senha: **123456**

Para recriar do zero, use `npx tsx --env-file=.env.local scripts/seed.ts --limpar`.

> O seed usa o SDK cliente, não o `firebase-admin`. Isso evita baixar uma chave
> de conta de serviço — credencial privilegiada que não deveria circular num
> repositório — e faz o script escrever passando pelas mesmas Security Rules do
> app: se ele funciona, as regras estão corretas.

---

## Arquitetura

```
src/
  app/              rotas (expo-router)
    (auth)/         login e cadastro
    (app)/          area logada, com abas
  components/       UI reutilizável, incluindo os gráficos
  contexts/         estado global (Context API)
  domain/           regras de negócio — TypeScript puro
  lib/              fronteira com o Firebase
```

**Sem backend próprio.** O app fala direto com o Firebase; a autorização vive nas
Security Rules. A regra de negócio que antes rodava num servidor foi redistribuída:

| Antes (backend) | Agora |
|---|---|
| Sinal do valor por tipo/destino | `domain/transaction.applySign` |
| Ordenação por data | `orderBy` no Firestore + rede de segurança no domínio |
| Cálculo de saldo | derivado no `TransactionsContext` |
| Guard de autorização | `firestore.rules` |

**Estado global com Context API**, como o desafio pede:

- `AuthContext` — sessão, perfil e as operações de autenticação
- `TransactionsContext` — transações em tempo real, saldo derivado e CRUD

**`src/domain/` não importa React nem Firebase.** É TypeScript puro, o que o torna
testável sem emulador e sem renderizar componente.

---

## Verificação

```bash
npm run verify
```

Roda, em sequência:

1. `npm run typecheck` — tipos
2. `npm run test` — 43 casos das regras de negócio (`src/domain/domain.test.ts`)
3. `expo export` — resolução de módulos e config plugins

O terceiro passo importa: config plugin inválido e módulo resolvido para a
plataforma errada **não aparecem no typecheck**, só na hora de empacotar.

---

## Decisões que valem explicação

**O tipo da transação guarda o valor canônico, nunca o rótulo.** O dado grava
`'pix'`; a tela mostra "Transferência Pix" via `TYPE_LABEL`. Guardar o rótulo no
dado gera divergência entre as telas que traduzem.

**O sinal do valor depende do destino, não só do tipo.** Depósito na própria conta
credita; em outra conta debita, porque o dinheiro sai daqui. Por isso o campo
`depositType` existe no documento.

**Formatação pt-BR implementada à mão, sem `Intl`.** O suporte a `Intl` no Hermes
varia entre plataformas e a falha só apareceria no dispositivo. Os formatos são
fixos, então implementá-los sai mais barato que depender do ambiente.

**Auth importado de `@firebase/auth`, não de `firebase/auth`.** O pacote
guarda-chuva não declara a condição de export `react-native` e entrega o build de
browser, que não contém `getReactNativePersistence` — sem ela a sessão morre a
cada reabertura do app.
