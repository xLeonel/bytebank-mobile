/**
 * Testes das regras de domínio — funções puras, sem Firebase e sem React.
 *
 * Rode com:  npx tsx src/domain/domain.test.ts
 *
 * Cobrem justamente os bugs que apareceram na versão web da Fase 2: o sinal do
 * depósito por destino, o rótulo do tipo que não fazia ida-e-volta e a ordenação
 * por data. São baratos de manter e pegam regressão nessas três frentes.
 */
import { agruparPorMes, agruparPorTipo, evolucaoDoSaldo } from './analytics';
import { suggestCategory } from './category';
import { formatBrl, formatDate, maskAmount, parseAmount } from './format';
import { applySign, calcularSaldo, ordenarPorDataDesc, TYPE_LABEL } from './transaction';
import type { Transaction } from './types';
import { validateAmount, validateDateNotFuture, validateDestino } from './validation';

let falhas = 0;
const eq = (nome: string, obtido: unknown, esperado: unknown) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  console.log(
    `${ok ? 'PASS' : 'FALHA'}  ${nome}` +
      (ok ? '' : `  obtido=${JSON.stringify(obtido)} esperado=${JSON.stringify(esperado)}`),
  );
  if (!ok) falhas++;
};

console.log('--- sinal do valor conforme o destino ---');
eq('deposito na propria conta credita', applySign('deposito', 'own', 1000), 1000);
eq('deposito em outra conta DEBITA', applySign('deposito', 'other', 1000), -1000);
eq('deposito sem destino credita', applySign('deposito', undefined, 1000), 1000);
eq('saque debita', applySign('saque', undefined, 300), -300);
eq('pix debita', applySign('pix', undefined, 50), -50);
eq('entrada negativa nao inverte duas vezes', applySign('saque', undefined, -300), -300);

console.log('\n--- rotulos de tipo ---');
eq('pix exibe "Transferencia Pix"', TYPE_LABEL.pix, 'Transferência Pix');
eq('existem exatamente 3 tipos', Object.keys(TYPE_LABEL).sort(), ['deposito', 'pix', 'saque']);

console.log('\n--- ordenacao ---');
const tx = (id: string, data: string, criado: string): Transaction => ({
  id,
  type: 'pix',
  amount: -1,
  date: new Date(data),
  createdAt: new Date(criado),
  attachments: [],
});
eq(
  'mais recente primeiro, desempate por createdAt',
  ordenarPorDataDesc([
    tx('antiga', '2020-01-01T00:00:00Z', '2026-08-16T10:00:00Z'),
    tx('hoje-cedo', '2026-08-16T00:00:00Z', '2026-08-16T08:00:00Z'),
    tx('hoje-tarde', '2026-08-16T00:00:00Z', '2026-08-16T20:00:00Z'),
    tx('ontem', '2026-08-15T00:00:00Z', '2026-08-15T09:00:00Z'),
  ]).map((t) => t.id),
  ['hoje-tarde', 'hoje-cedo', 'ontem', 'antiga'],
);

console.log('\n--- saldo ---');
eq(
  'saldo soma os valores com sinal',
  calcularSaldo([
    { ...tx('a', '2026-01-01', '2026-01-01'), amount: 1000 },
    { ...tx('b', '2026-01-01', '2026-01-01'), amount: -250.5 },
  ]),
  749.5,
);

console.log('\n--- formatacao (implementada sem Intl) ---');
eq('milhar e centavos', formatBrl(1234.5), 'R$ 1.234,50');
eq('negativo', formatBrl(-99), '-R$ 99,00');
eq('zero', formatBrl(0), 'R$ 0,00');
eq('milhoes', formatBrl(1234567.89), 'R$ 1.234.567,89');
eq('arredonda o centavo', formatBrl(0.005), 'R$ 0,01');
eq('mascara de digitacao', maskAmount('12345'), '123,45');
eq('mascara com milhar', maskAmount('123456789'), '1.234.567,89');
eq('mascara ignora nao-digitos', maskAmount('abc'), '');
eq('parse volta ao numero', parseAmount(maskAmount('123456')), 1234.56);
eq('data', formatDate(new Date(2026, 7, 15)), '15/08/2026');

console.log('\n--- sugestao de categoria ---');
eq('aluguel -> Moradia', suggestCategory('Pagamento aluguel'), 'Moradia');
eq('ifood -> Alimentacao', suggestCategory('iFood almoco'), 'Alimentação');
eq('desconhecido -> Outros', suggestCategory('xyz'), 'Outros');
eq('vazio -> Outros', suggestCategory(''), 'Outros');

console.log('\n--- validacao ---');
eq('valor zero invalido', validateAmount(0).valid, false);
eq('valor negativo invalido', validateAmount(-5).valid, false);
eq('NaN invalido', validateAmount(NaN).valid, false);
eq('valor positivo valido', validateAmount(10).valid, true);
const amanha = new Date();
amanha.setDate(amanha.getDate() + 1);
eq('data futura invalida', validateDateNotFuture(amanha).valid, false);
eq('data de hoje valida', validateDateNotFuture(new Date()).valid, true);
eq('destino sem agencia invalido', validateDestino('12', '3456').valid, false);
eq('destino completo valido', validateDestino('0001', '12345-6').valid, true);

console.log(String.fromCharCode(10) + '--- agregados dos graficos ---');
const comValor = (id: string, data: string, valor: number, tipo: Transaction['type'] = 'pix'): Transaction => ({
  ...tx(id, data, data),
  type: tipo,
  amount: valor,
});

// O bug da Fase 2: a direcao era fixada pela PRIMEIRA transacao do tipo. Com a
// lista ordenada por data, um unico deposito negativo recente pintava o grupo
// inteiro como saida.
const tipos = agruparPorTipo([
  comValor('d1', '2026-08-15', -22, 'deposito'), // deposito em outra conta, mais recente
  comValor('d2', '2026-08-10', 5000, 'deposito'),
  comValor('s1', '2026-08-09', -300, 'saque'),
]);
eq('deposito com liquido positivo e ENTRADA', tipos.find((t) => t.type === 'deposito')?.direcao, 'entrada');
eq('deposito soma com sinal', tipos.find((t) => t.type === 'deposito')?.total, 4978);
eq('saque e saida', tipos.find((t) => t.type === 'saque')?.direcao, 'saida');
eq('ordenado do maior para o menor', tipos.map((t) => t.type), ['deposito', 'saque']);
eq('tipo com liquido zero e omitido', agruparPorTipo([
  comValor('a', '2026-08-01', 100, 'pix'),
  comValor('b', '2026-08-02', -100, 'pix'),
]).length, 0);

const meses = agruparPorMes([
  comValor('a', '2026-07-10', 1000),
  comValor('b', '2026-07-20', -400),
  comValor('c', '2026-08-05', 200),
]);
eq('agrupa por mes em ordem cronologica', meses.map((m) => m.chave), ['2026-07', '2026-08']);
eq('saidas viram valor absoluto', meses[0].saidas, 400);
eq('entradas somadas', meses[0].entradas, 1000);

// A curva e reconstruida a partir do saldo ATUAL, andando para tras: o saldo de
// hoje e conhecido, um "saldo inicial" seria suposicao.
const curva = evolucaoDoSaldo([
  comValor('a', '2026-08-01', 1000),
  comValor('b', '2026-08-02', -250),
], 750);
eq('curva termina no saldo atual', curva[curva.length - 1].saldo, 750);
eq('curva comeca apos a primeira transacao', curva[0].saldo, 1000);
eq('curva em ordem cronologica', curva.length, 2);

console.log(
  falhas === 0 ? '\n=== TODOS OS TESTES PASSARAM ===' : `\n=== ${falhas} FALHA(S) ===`,
);
process.exit(falhas === 0 ? 0 : 1);
