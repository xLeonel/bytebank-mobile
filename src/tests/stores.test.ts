/**
 * Testes das stores de transações e do extrato, com um repositório falso em que
 * cada resposta é liberada à mão. É o que permite reproduzir as corridas: a
 * resposta de um filtro antigo chegando depois da troca, ou o "carregar mais" em
 * rajada durante a rolagem.
 *
 * Rode com:  npm test
 */
import { Subject } from 'rxjs';

import { criarStoreDoExtrato } from '@/modules/transactions/application/extratoStore';
import type {
  CursorDePagina,
  OpcoesDePagina,
  Pagina,
  TransactionRepository,
} from '@/modules/transactions/application/ports';
import { criarStoreDasTransacoes } from '@/modules/transactions/application/transactionsStore';
import type { Transaction } from '@/modules/transactions/domain/types';

import { eq, finalizar } from './harness';

const tx = (id: string, amount = -1): Transaction => ({
  id,
  type: 'pix',
  amount,
  date: new Date(2026, 7, 15),
  createdAt: new Date(2026, 7, 15),
  attachments: [],
});

const pagina = (ids: string[], acabou = false): Pagina => ({
  itens: ids.map((id) => tx(id)),
  cursor: (ids.at(-1) ?? null) as unknown as CursorDePagina | null,
  acabou,
});

/** Deixa os microtasks das respostas e os agendamentos do RxJS rodarem. */
const passar = (ms = 0) => new Promise((resolver) => setTimeout(resolver, ms));

function repositorioControlado() {
  const chamadas: { opcoes: OpcoesDePagina; responder: (p: Pagina) => void; falhar: (e: Error) => void }[] = [];
  const repositorio: Pick<TransactionRepository, 'buscarPagina'> = {
    buscarPagina: (_uid, opcoes = {}) =>
      new Promise<Pagina>((responder, falhar) => chamadas.push({ opcoes, responder, falhar })),
  };
  return { repositorio, chamadas };
}

function montarExtrato() {
  const { repositorio, chamadas } = repositorioControlado();
  const alteracoes = new Subject<void>();
  const extrato = criarStoreDoExtrato({
    repositorio,
    alteracoes$: alteracoes.asObservable(),
    tamanhoDaPagina: 2,
    esperaDeAlteracao: 5,
  });
  const ids = () => extrato.store.getState().itens.map((t) => t.id);
  return { extrato, chamadas, alteracoes, ids };
}

async function testarPaginacao() {
  console.log('--- paginacao do extrato ---');
  const { extrato, chamadas, ids } = montarExtrato();
  const desconectar = extrato.conectar('u1');

  eq('comeca carregando', extrato.store.getState().carregandoInicial, true);
  eq('faz uma consulta inicial', chamadas.length, 1);

  chamadas[0].responder(pagina(['a', 'b']));
  await passar();
  eq('primeira pagina entra na lista', ids(), ['a', 'b']);
  eq('sai do carregamento', extrato.store.getState().carregandoInicial, false);

  extrato.carregarMais();
  extrato.carregarMais();
  extrato.carregarMais();
  eq('rajada de carregar mais vira uma consulta', chamadas.length, 2);
  eq('continua a partir do cursor', chamadas[1].opcoes.cursor, 'b');
  eq('sinaliza que carrega mais', extrato.store.getState().carregandoMais, true);

  chamadas[1].responder(pagina(['c'], true));
  await passar();
  eq('nova pagina vai para o fim', ids(), ['a', 'b', 'c']);
  eq('marca o fim do extrato', extrato.store.getState().acabou, true);

  extrato.carregarMais();
  eq('depois do fim nao consulta mais', chamadas.length, 2);

  desconectar();
}

async function testarFiltros() {
  console.log('\n--- troca de filtro ---');

  {
    const { extrato, chamadas, ids } = montarExtrato();
    const desconectar = extrato.conectar('u1');

    extrato.filtrar({ type: 'saque' });
    eq('filtro novo faz outra consulta', chamadas.length, 2);
    eq('consulta usa o filtro novo', chamadas[1].opcoes.filtros, { type: 'saque' });

    chamadas[1].responder(pagina(['saque1']));
    await passar();
    chamadas[0].responder(pagina(['atrasada']));
    await passar();
    eq('resposta atrasada do filtro antigo e descartada', ids(), ['saque1']);

    desconectar();
  }

  {
    // O bug da versao anterior: a pagina de "carregar mais" pedida antes da troca
    // era concatenada a lista do filtro novo.
    const { extrato, chamadas, ids } = montarExtrato();
    const desconectar = extrato.conectar('u1');
    chamadas[0].responder(pagina(['a', 'b']));
    await passar();

    extrato.carregarMais();
    extrato.filtrar({ type: 'pix' });
    eq('a troca limpa o carregando mais', extrato.store.getState().carregandoMais, false);
    eq('a troca volta ao carregamento inicial', extrato.store.getState().carregandoInicial, true);

    chamadas[2].responder(pagina(['pix1', 'pix2']));
    await passar();
    chamadas[1].responder(pagina(['c-do-filtro-antigo']));
    await passar();
    eq('pagina do filtro antigo nao se mistura', ids(), ['pix1', 'pix2']);

    desconectar();
  }

  {
    const { extrato, chamadas } = montarExtrato();
    const desconectar = extrato.conectar('u1');
    extrato.filtrar({});
    eq('filtro igual nao consulta de novo', chamadas.length, 1);
    extrato.filtrar({ category: 'Lazer' });
    extrato.filtrar({ type: 'pix' });
    eq('os filtros se acumulam', chamadas[2].opcoes.filtros, { category: 'Lazer', type: 'pix' });
    desconectar();
  }
}

async function testarAlteracoes() {
  console.log('\n--- atualizacao apos alteracao ---');

  {
    const { extrato, chamadas, alteracoes, ids } = montarExtrato();
    const desconectar = extrato.conectar('u1');
    chamadas[0].responder(pagina(['a', 'b']));
    await passar();
    extrato.carregarMais();
    chamadas[1].responder(pagina(['c', 'd']));
    await passar();

    alteracoes.next();
    alteracoes.next();
    alteracoes.next();
    eq('espera os avisos pararem antes de consultar', chamadas.length, 2);
    await passar(15);
    eq('rajada de avisos vira uma consulta', chamadas.length, 3);
    eq('recarrega tudo o que estava aberto', chamadas[2].opcoes.tamanho, 4);
    eq('recarrega do inicio', chamadas[2].opcoes.cursor, undefined);
    eq('nao volta para o esqueleto', extrato.store.getState().carregandoInicial, false);
    eq('mantem a lista enquanto recarrega', ids(), ['a', 'b', 'c', 'd']);

    chamadas[2].responder(pagina(['novo', 'a', 'b', 'c']));
    await passar();
    eq('lista recebe a transacao nova', ids(), ['novo', 'a', 'b', 'c']);

    extrato.carregarMais();
    eq('continua do cursor recarregado', chamadas[3].opcoes.cursor, 'c');

    desconectar();
  }

  {
    const { extrato, chamadas, alteracoes, ids } = montarExtrato();
    const desconectar = extrato.conectar('u1');
    chamadas[0].responder(pagina(['a', 'b']));
    await passar();

    extrato.carregarMais();
    alteracoes.next();
    await passar(15);
    chamadas[2].responder(pagina(['x', 'y']));
    await passar();
    chamadas[1].responder(pagina(['antiga']));
    await passar();
    eq('recarga descarta o carregar mais pendente', ids(), ['x', 'y']);
    eq('nao fica preso carregando mais', extrato.store.getState().carregandoMais, false);

    desconectar();
  }
}

async function testarFalhas() {
  console.log('\n--- falhas e encerramento ---');

  {
    const { extrato, chamadas, alteracoes, ids } = montarExtrato();
    const desconectar = extrato.conectar('u1');

    chamadas[0].falhar(new Error('sem rede'));
    await passar();
    eq('erro da consulta chega ao estado', extrato.store.getState().erro, 'sem rede');
    eq('erro encerra o carregamento', extrato.store.getState().carregandoInicial, false);

    alteracoes.next();
    await passar(15);
    chamadas[1].responder(pagina(['a']));
    await passar();
    eq('fluxo sobrevive ao erro', ids(), ['a']);
    eq('recarga bem-sucedida limpa o erro', extrato.store.getState().erro, null);

    desconectar();
  }

  {
    const { extrato, chamadas, ids } = montarExtrato();
    const desconectar = extrato.conectar('u1');
    chamadas[0].responder(pagina(['a']));
    await passar();

    extrato.carregarMais();
    desconectar();
    chamadas[1].responder(pagina(['depois-de-sair']));
    await passar();
    eq('resposta apos desconectar e ignorada', ids(), []);
    eq('desconectar volta ao estado inicial', extrato.store.getState().carregandoInicial, true);

    extrato.conectar('u2');
    eq('reconectar consulta o proximo usuario', chamadas.length, 3);
    eq('reconectar comeca sem filtro', chamadas[2].opcoes.filtros, {});
  }
}

function testarTransacoes() {
  console.log('\n--- transacoes em tempo real ---');

  let emitir: (lista: Transaction[]) => void = () => {};
  let falharAssinatura: (erro: Error) => void = () => {};
  let cancelou = false;
  const transacoes = criarStoreDasTransacoes({
    observarTodas: (_uid, aoMudar, aoFalhar) => {
      emitir = aoMudar;
      falharAssinatura = (erro) => aoFalhar?.(erro);
      return () => {
        cancelou = true;
      };
    },
  });

  let avisos = 0;
  transacoes.alteracoes$.subscribe(() => avisos++);
  const estado = () => transacoes.store.getState();

  eq('comeca carregando', estado().carregando, true);

  const encerrar = transacoes.sincronizar('u1');
  emitir([tx('a', 1000), tx('b', -250)]);
  eq('saldo e derivado da lista', estado().saldo, 750);
  eq('sai do carregamento', estado().carregando, false);
  eq('primeira carga nao avisa alteracao', avisos, 0);

  emitir([tx('a', 1000)]);
  eq('saldo acompanha a mudanca', estado().saldo, 1000);
  eq('mudanca seguinte avisa alteracao', avisos, 1);

  const listaAntesDoErro = estado().transacoes;
  falharAssinatura(new Error('permissao'));
  eq('erro chega ao estado', estado().erro, 'permissao');
  eq('erro nao apaga o que ja foi carregado', estado().transacoes === listaAntesDoErro, true);

  encerrar();
  eq('encerrar cancela a assinatura', cancelou, true);
  eq('encerrar limpa as transacoes do usuario', estado().transacoes.length, 0);
  eq('encerrar zera o saldo', estado().saldo, 0);
}

async function testarConexaoCompartilhada() {
  console.log('\n--- extrato compartilhado entre pre-carga e tela ---');
  const { extrato, chamadas, ids } = montarExtrato();

  const soltarPreCarga = extrato.conectar('u1');
  const soltarTela = extrato.conectar('u1');
  eq('pre-carga e tela fazem uma consulta so', chamadas.length, 1);

  chamadas[0].responder(pagina(['a', 'b']));
  await passar();
  soltarPreCarga();
  eq('a tela segue com a lista apos a pre-carga soltar', ids(), ['a', 'b']);

  soltarPreCarga();
  eq('soltar duas vezes nao derruba a tela', ids(), ['a', 'b']);

  soltarTela();
  eq('sem ninguem conectado o extrato e limpo', ids(), []);

  extrato.conectar('u1');
  eq('conectar de novo consulta de novo', chamadas.length, 2);
}

async function testarCache() {
  console.log('\n--- cache das transacoes ---');

  function montar(cacheLista: Transaction[] | null = null) {
    let emitir: (lista: Transaction[]) => void = () => {};
    let responderCache: (lista: Transaction[] | null) => void = () => {};
    const gravados: Transaction[][] = [];
    const limpos: string[] = [];
    const transacoes = criarStoreDasTransacoes(
      {
        observarTodas: (_uid, aoMudar) => {
          emitir = aoMudar;
          return () => {};
        },
      },
      {
        ler: () =>
          cacheLista === null
            ? new Promise((resolver) => (responderCache = resolver))
            : Promise.resolve(cacheLista),
        gravar: async (_uid, lista) => {
          gravados.push(lista);
        },
        limpar: async (uid) => {
          limpos.push(uid);
        },
      },
      5,
    );
    return {
      transacoes,
      estado: () => transacoes.store.getState(),
      emitir: (l: Transaction[]) => emitir(l),
      responderCache: (l: Transaction[] | null) => responderCache(l),
      gravados,
      limpos,
    };
  }

  {
    const m = montar([tx('a', 500)]);
    const encerrar = m.transacoes.sincronizar('u1');
    await passar();
    eq('abre com a lista do cache', m.estado().transacoes.map((t) => t.id), ['a']);
    eq('saldo calculado do cache', m.estado().saldo, 500);
    eq('marca que veio do cache', m.estado().doCache, true);
    eq('nao fica carregando com o cache', m.estado().carregando, false);

    m.emitir([tx('a', 500), tx('b', -100)]);
    eq('a resposta do servidor substitui o cache', m.estado().saldo, 400);
    eq('deixa de marcar cache', m.estado().doCache, false);

    m.emitir([tx('a', 500)]);
    m.emitir([tx('a', 500), tx('c', 1)]);
    await passar(20);
    eq('grava uma vez depois que as atualizacoes param', m.gravados.length, 1);
    eq('grava a lista mais recente', m.gravados[0].map((t) => t.id), ['a', 'c']);

    encerrar();
    eq('sair da conta limpa o cache', m.limpos, ['u1']);
  }

  {
    const m = montar();
    const encerrar = m.transacoes.sincronizar('u1');
    m.emitir([tx('servidor', 1)]);
    m.responderCache([tx('antigo', 999)]);
    await passar();
    eq('cache lento nao sobrescreve o servidor', m.estado().transacoes.map((t) => t.id), ['servidor']);
    encerrar();
  }

  {
    const m = montar();
    const encerrar = m.transacoes.sincronizar('u1');
    encerrar();
    m.responderCache([tx('outro-usuario', 1)]);
    await passar();
    eq('cache que chega apos sair e ignorado', m.estado().transacoes.length, 0);
  }

  {
    const m = montar();
    const encerrar = m.transacoes.sincronizar('u1');
    m.emitir([tx('a', 1)]);
    encerrar();
    await passar(20);
    eq('sair antes da gravacao cancela a gravacao', m.gravados.length, 0);
  }
}

async function main() {
  await testarPaginacao();
  await testarFiltros();
  await testarAlteracoes();
  await testarFalhas();
  testarTransacoes();
  await testarConexaoCompartilhada();
  await testarCache();
  finalizar();
}

main();
