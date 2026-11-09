# Bytebank Mobile

Aplicação de gerenciamento financeiro em **React Native + Expo**, com **Firebase**
como backend (Authentication, Cloud Firestore e Cloud Storage).

Tech Challenge — Fases 3 e 4 (FIAP Pós Tech).

---

## O que o app faz

| Tela | Recursos |
|---|---|
| **Login / Cadastro** | Autenticação por e-mail e senha, com sessão cifrada e bloqueio por biometria ou senha do aparelho |
| **Início** | Saldo, dados da conta, análise financeira com gráficos e transições animadas, e as últimas transações |
| **Nova transação** | Depósito, Saque e Transferência Pix, com validação de campos e upload de comprovante |
| **Extrato** | Filtros por tipo e categoria, scroll infinito paginado no Firestore e atualização automática |
| **Ajustes** | Foto de perfil, dados da conta e saída da sessão |

---

## Fase 4: onde está cada requisito

| Requisito do desafio | Onde está |
|---|---|
| Arquitetura modular e Clean Architecture | Módulos por funcionalidade em `src/modules`, com camadas separadas e a regra de dependência imposta pelo lint. Ver [Arquitetura](#arquitetura) |
| State management avançado | Zustand com seletores, na camada de aplicação. Ver [Estado e programação reativa](#estado-e-programação-reativa) |
| Programação reativa | Fluxo RxJS do extrato: filtros, paginação e atualização automática |
| Lazy loading e pré-carregamento | Gráficos carregados sob demanda e extrato pré-carregado. Ver [docs/performance.md](docs/performance.md) |
| Cache | Última lista de transações guardada no aparelho, cifrada |
| Autenticação segura e criptografia | Sessão com AES-256-GCM e chave no Keychain/Keystore, bloqueio local e regras do Firebase. Ver [Segurança](#segurança) |

---

## Tecnologias utilizadas

| Área | Tecnologia |
|---|---|
| App | React Native 0.88, React 19.3, Expo SDK 58, TypeScript 6 |
| Navegação | Expo Router 58 (rotas por arquivo, pilha e abas) |
| Backend | Firebase 12: Authentication, Cloud Firestore e Cloud Storage, com Security Rules |
| Estado | Context API (sessão) e Zustand 5 (transações e extrato) |
| Programação reativa | RxJS 7 |
| Segurança | `@noble/ciphers` (AES-256-GCM), `expo-secure-store`, `expo-crypto`, `expo-local-authentication` |
| Imagens | `expo-image`, `expo-image-picker`, `expo-image-manipulator` |
| Gráficos | `react-native-svg` |
| Qualidade | ESLint com a regra de camadas, React Compiler, testes com `tsx`, Expo Doctor |

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

O login abre o navegador para você entrar com a conta Google dona do projeto:

```bash
npx firebase-tools login
```

```bash
npx firebase-tools use SEU_PROJECT_ID
```

Para só checar se as regras compilam, sem publicar, acrescente `--dry-run` ao comando
abaixo.

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage
```

Isso publica:

- `firestore.rules` — cada usuário lê e escreve apenas sob `users/{uid}`, com validação
  de campos, do sinal do valor e de dados que não podem mudar
- `firestore.indexes.json` — índices compostos dos filtros do extrato
- `storage.rules` — recibos e foto de perfil restritos ao dono, com limite de 5 MB e
  lista fechada de tipos de arquivo

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

> **Windows (PowerShell).** Se aparecer *"a execução de scripts foi desabilitada"*,
> use `npx.cmd` no lugar de `npx`, por exemplo `npx.cmd expo start`. Não é preciso
> mudar a política de execução do sistema.

> **Login no Expo.** Se o Expo Go estiver logado numa conta, o projeto só abre com o
> CLI logado na mesma conta (erro *"You're signed in to Expo Go as ..., but not
> signed in to Expo CLI"*). Rode `npx expo login`. Se o navegador abrir com o endereço
> cortado, use o link completo que o terminal mostra. Sem conta no Expo Go, o login
> não é necessário.

> Se o projeto não aparecer na lista do Expo Go, use **"Enter URL manually"** com
> o endereço `exp://SEU_IP_LOCAL:8081`.

> **No navegador** (`npx expo start --web`), o app roda para conferir telas e fluxos,
> mas câmera, biometria, seletor de data e o cache local só funcionam no celular.

### Verificações

| Comando | O que faz |
|---|---|
| `npm test` | Testes de domínio, casos de uso, stores e segurança, sem Firebase |
| `npm run typecheck` | Checagem de tipos |
| `npm run lint` | ESLint, incluindo a regra de dependência entre camadas |
| `npm run verify` | Tipos, testes e o bundle Android gerado de ponta a ponta |

### Dados de demonstração

Popula o Firestore com um usuário demo e 48 transações distribuídas em 8 meses:

```bash
npm run seed
```

Login: **demo@bytebank.com** · senha: **123456**

> A senha demo é anterior à regra de senha da Fase 4 (8 caracteres, com letras e
> números), que vale só para contas criadas pelo app. O seed cria a conta direto pelo
> Firebase.

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
    infrastructure/     Firebase, envio de arquivos e armazenamento criptografado
    ui/                 componentes genéricos, tema e avisos
  tests/                testes de domínio, casos de uso, stores e segurança
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

### Estado e programação reativa

Cada tipo de estado usa a ferramenta adequada:

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

### Segurança

| Proteção | Como funciona |
|---|---|
| Sessão criptografada | O refresh token é gravado com AES-256-GCM. A chave fica no Keychain/Keystore (`expo-secure-store`), presa ao aparelho, e sessões antigas em texto puro são cifradas na primeira leitura |
| Bloqueio local | Biometria ou senha do aparelho ao abrir com sessão restaurada e ao voltar de mais de 30 s em segundo plano. No Expo Go do iPhone o Face ID não está disponível, então vale a senha do aparelho; em um build próprio ele funciona |
| Capa de privacidade | Esconde o saldo no alternador de apps enquanto o app está fora de foco |
| Dados ao sair | Encerrar a sessão apaga da memória as transações e o extrato, e do aparelho o cache das transações |
| Recibos | O documento guarda só o caminho do arquivo: a URL dá acesso sem passar pelas regras do Storage, então é obtida só para exibir. Excluir a transação apaga também os arquivos |
| Regras do Firebase | Validam campos, tamanhos e o sinal do valor, travam agência, conta e `createdAt`, e limitam os tipos de arquivo |
| Senha de conta nova | Ao menos 8 caracteres, com letras e números |

### Performance

A tela aparece sem esperar o perfil, a lista abre a partir de um cache cifrado, o
extrato é pré-carregado e os gráficos são carregados sob demanda. No iPhone, a tela
passou de cerca de 1,1 s para 0,5 s e uma foto de recibo de 4,6 MB para 311 KB. O que
foi feito, como medir e os números estão em [docs/performance.md](docs/performance.md).
