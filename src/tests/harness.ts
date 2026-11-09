let falhas = 0;

export const eq = (nome: string, obtido: unknown, esperado: unknown) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  console.log(
    `${ok ? 'PASS' : 'FALHA'}  ${nome}` +
      (ok ? '' : `  obtido=${JSON.stringify(obtido)} esperado=${JSON.stringify(esperado)}`),
  );
  if (!ok) falhas++;
};

export function finalizar() {
  console.log(
    falhas === 0 ? '\n=== TODOS OS TESTES PASSARAM ===' : `\n=== ${falhas} FALHA(S) ===`,
  );
  process.exit(falhas === 0 ? 0 : 1);
}
