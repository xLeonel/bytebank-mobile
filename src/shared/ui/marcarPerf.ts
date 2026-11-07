/**
 * Marcas de tempo para comparar o antes e o depois das otimizações.
 *
 * Só logam em desenvolvimento, então os valores absolutos saem maiores que em
 * produção; o que importa é comparar medições feitas nas mesmas condições. O
 * passo a passo está em docs/performance.md.
 */
const inicio = performance.now();

/** Tempo decorrido desde o carregamento do JS. */
export function marcarPerf(rotulo: string) {
  if (!__DEV__) return;
  console.log(`[perf] ${rotulo}: ${Math.round(performance.now() - inicio)}ms`);
}

/** Duração de uma operação: chame o retorno quando ela terminar. */
export function iniciarMedicao(rotulo: string): () => void {
  const comeco = performance.now();
  return () => {
    if (!__DEV__) return;
    console.log(`[perf] ${rotulo}: ${Math.round(performance.now() - comeco)}ms`);
  };
}
