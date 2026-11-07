# Medições de performance

Referência para comparar o antes e o depois das otimizações da Fase 4. Meça sempre
no mesmo aparelho e na mesma rede, e anote a mediana de 3 aberturas.

## Como medir

**1. Massa de dados.** Com o `.env.local` preenchido:

```bash
npx tsx --env-file=.env.local scripts/seed.ts --limpar --volume=2000
```

**2. Tempos.** Rode `npx expo start`, entre com o usuário demo e feche e reabra o
app. As marcas aparecem no terminal do Metro com o prefixo `[perf]`:

| Marca | O que mede |
|---|---|
| `sessao resolvida` | Do carregamento do JS até a sessão ser restaurada |
| `perfil carregado` | Até o perfil chegar, ponto em que a tela de carregamento hoje termina |
| `primeira carga das transacoes` | Da assinatura até a primeira lista completa |
| `primeira pagina do extrato` | Da abertura do extrato ou troca de filtro até a página chegar |

As marcas só logam em modo de desenvolvimento, então os valores absolutos são maiores
que em produção. Servem para comparar medições feitas nas mesmas condições.

**3. Bundle.**

```bash
npx expo export --platform android --output-dir .verify
```

## Resultados

A migração do SDK 54 para o 58 mudou o ponto de partida do bundle: o Android foi de
5,05 MB para 5,3 MB, e o iOS ficou em 5 MB. Compare as otimizações com estes valores
do SDK 58. Os tempos ainda não foram medidos.

| Métrica | Antes das otimizações | Depois |
|---|---|---|
| Bundle Android (Hermes) | 5,3 MB | a medir |
| Bundle iOS (Hermes) | 5 MB | a medir |
| Sessão resolvida | a medir | a medir |
| Perfil carregado | a medir | a medir |
| Primeira carga, 48 transações | a medir | a medir |
| Primeira carga, 2000 transações | a medir | a medir |
| Primeira página do extrato | a medir | a medir |
