# Bytebank Mobile

Aplicação de gerenciamento financeiro em **React Native + Expo**, com **Firebase**
como backend (Authentication, Cloud Firestore e Cloud Storage).

Tech Challenge — Fases 3 e 4 (FIAP Pós Tech).

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

- **Node.js 22.13+** (ou 24.3+)
- **Expo Go** no celular — [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) · [iOS](https://apps.apple.com/app/expo-go/id982107779)
- Uma conta Google para criar o projeto Firebase

> **Atenção à versão do Expo Go.** Este projeto está no **SDK 58**. Quem dita o SDK
> é o Expo Go instalado: se as versões não baterem, abrir o projeto falha com
> *"Project is incompatible with this version of Expo Go"*. Em **Expo Go → Settings**
> aparece o SDK suportado pelo aparelho. Para rodar em outro SDK seria preciso gerar
> um development build (EAS).

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
Acrescente `--volume=2000` para gerar mais transações e medir a performance.

> O seed usa o SDK cliente, não o `firebase-admin`. Isso evita baixar uma chave
> de conta de serviço — credencial privilegiada que não deveria circular num
> repositório — e faz o script escrever passando pelas mesmas Security Rules do
> app: se ele funciona, as regras estão corretas.

---

## Arquitetura

Módulos por funcionalidade, cada um dividido nas camadas da Clean Architecture:

```
src/
  app/                  rotas (expo-router): só layouts e reexportação das telas
    (auth)/             login e cadastro
    (app)/              área logada: pilha com as abas e as telas de detalhe
      (tabs)/           início, nova transação, extrato e ajustes
      transacao/[id]    edição, aberta por cima das abas
  composition/          raiz de composição: liga os casos de uso às implementações
  modules/
    auth/               sessão, login e cadastro
    profile/            perfil, foto e dados da conta
    transactions/       transações, recibos, extrato e formulários
    dashboard/          tela inicial e análise financeira
      domain/           regras de negócio: TypeScript puro
      application/      casos de uso e portas (contratos com o mundo externo)
      infrastructure/   implementação das portas com o Firebase
      presentation/     telas, componentes e estado de tela
  shared/
    domain/             formatação e validações genéricas
    infrastructure/     inicialização do Firebase e envio de arquivos
    ui/                 componentes genéricos e tema
  tests/                testes de domínio e de casos de uso
```

Nem todo módulo tem todas as camadas: `dashboard` só deriva dados de `transactions`.

**As dependências só apontam para dentro**, e o lint garante isso (`eslint.config.js`):

| Camada | Pode importar | Não pode importar |
|---|---|---|
| `domain` | outros `domain` | framework, Firebase e qualquer outra camada |
| `application` | `domain` | framework, Firebase, `infrastructure`, `presentation` |
| `infrastructure` | `application`, `domain`, Firebase | `presentation`, `composition` |
| `presentation` | `application`, `domain`, `composition`, `shared/ui` | Firebase, `infrastructure` |

`composition/container.ts` é o único arquivo que conhece os dois lados. Por isso os
casos de uso são testados com portas falsas em memória, sem Firebase nem emulador:

```bash
npm test
```

**Sem backend próprio.** O app fala direto com o Firebase; a autorização vive nas
Security Rules. A regra de negócio que antes rodava num servidor foi redistribuída:

| Antes (backend) | Agora |
|---|---|
| Sinal do valor por tipo/destino | `transactions/domain/transaction.applySign`, aplicado nos casos de uso |
| Ordenação por data | `orderBy` no Firestore + rede de segurança no domínio |
| Cálculo de saldo | derivado em `transactions/application/transactionsStore` |
| Guard de autorização | `firestore.rules` |

**Estado e programação reativa.** Cada tipo de estado usa a ferramenta adequada:

| Estado | Onde fica | Por quê |
|---|---|---|
| Sessão e perfil | `AuthContext` (Context API) | Muda raramente: login, logout e edição do perfil |
| Transações em tempo real e saldo | `transactionsStore` (Zustand) | Muda a cada escrita. Com seletores, cada tela renderiza de novo só quando o valor que lê muda, e os formulários que só gravam não assinam a lista |
| Extrato: filtros e páginas | `extratoStore` (Zustand + RxJS) | Consultas assíncronas que competem entre si |

As stores ficam na camada de aplicação, sem React, e são testadas com um repositório
falso que libera cada resposta à mão. O fluxo do extrato é uma composição de operadores:

- `switchMap` nos filtros: filtro novo cancela a consulta anterior, então uma resposta
  atrasada nunca entra na lista errada;
- `exhaustMap` no "carregar mais": a rajada do `onEndReached` vira uma consulta só;
- `debounceTime` + `switchMap` nas alterações: criar, editar ou excluir uma transação
  recarrega o que já estava aberto, sem perder a posição da rolagem.

As medições de performance e o passo a passo para repeti-las estão em
[docs/performance.md](docs/performance.md).
