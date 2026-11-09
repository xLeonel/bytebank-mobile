# Performance

O que foi otimizado na Fase 4, como medir e os resultados. Meça sempre no mesmo
aparelho e na mesma rede, e anote a mediana de 3 aberturas.

## O que foi feito

| Requisito | Onde | O que muda |
|---|---|---|
| Abertura | `AuthContext`, `app/_layout` | A tela aparece assim que a sessão resolve, sem esperar o perfil chegar do servidor. A splash nativa fica até esse momento, sem um spinner no meio |
| Cache | `transactionsStore` + `cacheDeTransacoesNoAparelho` | A última lista de transações fica no aparelho, cifrada como a sessão. O app abre com ela e troca pela resposta do servidor quando chega. Sair da conta apaga o cache |
| Pré-carregamento | `usePreCarregarExtrato` | Quando o app fica ocioso depois de abrir, a primeira página do extrato é buscada; a aba já abre preenchida |
| Carregamento sob demanda | `AnaliseFinanceira` | Cada gráfico é carregado só quando a seção dele aparece, e só o agregado da seção visível é calculado |
| Imagens | `prepararImagem`, `expo-image` | Recibos são reduzidos para até 1600 px e a foto de perfil para 512 px antes do upload. As imagens usam `expo-image`: recibos com cache só em memória, por serem dados financeiros, e a foto com cache em disco |
| Programação reativa | `extratoStore` | Ver o README: filtros cancelam consultas antigas e alterações recarregam o extrato |

**Sobre o tamanho do bundle.** No app nativo o Metro gera um bundle só, então carregar
um gráfico sob demanda adia a execução do código dele, mas não o tira do arquivo. O
bundle é dominado pelo próprio framework: medido com source maps, React Native (29%),
Expo Router (17%) e Firestore (16%) somam 62%. RxJS e criptografia ficam em 2,9% e 1,6%.

## Como medir

**1. Massa de dados (opcional).** Grava no Firebase do `.env.local`:

```bash
npx tsx --env-file=.env.local scripts/seed.ts --limpar --volume=2000
```

**2. Tempos.** Rode `npx expo start`, entre e feche e reabra o app duas vezes: a
primeira abertura ainda não tem cache. As marcas aparecem no terminal do Metro com o
prefixo `[perf]`:

| Marca | O que mede |
|---|---|
| `sessao resolvida` | Do carregamento do JS até a sessão ser restaurada; a tela aparece aqui |
| `perfil carregado` | Até nome e conta chegarem, já com a tela à mostra |
| `transacoes exibidas do cache` | Até a lista guardada aparecer (só no celular, a partir da 2ª abertura) |
| `transacoes recebidas do servidor` | Até a lista do servidor chegar |
| `extrato pre-carregado` | Quando a busca antecipada do extrato começou |
| `extrato aberto ja carregado` | A aba abriu com a lista pronta, sem espera |
| `primeira pagina do extrato` | Da troca de filtro até a página chegar |
| `imagem preparada` | Tamanho da foto antes e depois da redução |

As marcas só logam em modo de desenvolvimento, então os valores absolutos são maiores
que em produção. Servem para comparar medições feitas nas mesmas condições.

**3. Bundle.**

```bash
npx expo export --platform ios --output-dir .verify
```

## Resultados

Bundle (Hermes, `expo export`):

| Plataforma | SDK 54, Fase 3 | SDK 58, antes das otimizações | Depois |
|---|---|---|---|
| Android | 5,05 MB | 5,7 MB | 5,7 MB |
| iOS | — | 5,3 MB | 5,4 MB |

O crescimento depois da Fase 3 vem da migração de SDK e das bibliotecas novas (RxJS,
Zustand, criptografia, `expo-image`, `expo-image-manipulator`).

Tempos no iPhone, modo de desenvolvimento, conta demo com cerca de 48 transações. Cada
valor é de uma abertura só, então serve como ordem de grandeza, não como média:

| Etapa | Antes das otimizações | Depois |
|---|---|---|
| Tela à mostra | 1.065 ms, presa até o perfil chegar (1.430 ms) | 510 a 598 ms; o perfil completa o card depois |
| Lista de transações na tela, a partir da sincronização | 154 ms, vinda do servidor | 33 ms pelo cache; o servidor confirma em 326 ms |
| Extrato ao abrir a aba | 136 ms de carregamento | já carregado |
| Foto de recibo enviada | 4.640 KB (3024×4032) | 311 KB (1200×1600) |

O pré-carregamento do extrato espera a lista do servidor chegar: na primeira versão ele
começava antes e disputava a rede com a tela inicial.

Na web, o extrato abriu com a lista pronta em menos de 0,3 s após o toque na aba.

**Ponto conhecido.** Ler um arquivo local com `fetch(uri).blob()`, como no envio ao
Storage, passa pelo Blob do React Native, que o Expo avisa ser lento para arquivos
grandes. Com as fotos reduzidas para algumas centenas de KB o impacto é pequeno; o
pacote `expo-blob`, sugerido pelo aviso, fica como melhoria futura.
