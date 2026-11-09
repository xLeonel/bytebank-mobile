import {
  BehaviorSubject,
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
  filter,
  from,
  startWith,
  switchMap,
  tap,
  type Observable,
} from 'rxjs';
import { createStore } from 'zustand/vanilla';

import type { Filtros, Transaction } from '@/modules/transactions/domain/types';

import type { Pagina, TransactionRepository } from './ports';

export type EstadoDoExtrato = {
  filtros: Filtros;
  itens: Transaction[];
  acabou: boolean;
  carregandoInicial: boolean;
  carregandoMais: boolean;
  erro: string | null;
};

const INICIAL: EstadoDoExtrato = {
  filtros: {},
  itens: [],
  acabou: false,
  carregandoInicial: true,
  carregandoMais: false,
  erro: null,
};

function mesmosFiltros(a: Filtros, b: Filtros): boolean {
  return (
    a.type === b.type &&
    a.category === b.category &&
    a.de?.getTime() === b.de?.getTime() &&
    a.ate?.getTime() === b.ate?.getTime()
  );
}

type Dependencias = {
  repositorio: Pick<TransactionRepository, 'buscarPagina'>;
  /** Avisa que as transações mudaram e a lista pode estar desatualizada. */
  alteracoes$: Observable<void>;
  tamanhoDaPagina?: number;
  /** Uma escrita gera mais de um aviso; só recarrega depois de eles pararem. */
  esperaDeAlteracao?: number;
};

/**
 * Listagem paginada do extrato, com os filtros e o scroll infinito.
 *
 * O fluxo é uma composição de três regras:
 * - `switchMap` nos filtros: filtro novo cancela a consulta anterior, então a
 *   resposta atrasada de um filtro antigo nunca entra na lista;
 * - `exhaustMap` nos pedidos de "carregar mais": o `onEndReached` dispara em
 *   rajada durante a rolagem, e só o primeiro pedido vira consulta;
 * - `switchMap` nas alterações: transação criada, editada ou excluída recarrega o
 *   que já estava aberto, mantendo a posição de quem rolou várias páginas.
 */
export function criarStoreDoExtrato({
  repositorio,
  alteracoes$,
  tamanhoDaPagina = 15,
  esperaDeAlteracao = 300,
}: Dependencias) {
  const store = createStore<EstadoDoExtrato>(() => INICIAL);
  const filtros$ = new BehaviorSubject<Filtros>(INICIAL.filtros);
  const pedidosDeMais$ = new Subject<void>();
  let conexao: { uid: string; usos: number; encerrar: () => void } | null = null;

  function falhar(erro: Error) {
    store.setState({ erro: erro.message, carregandoInicial: false, carregandoMais: false });
    return EMPTY;
  }

  function aoFinalDaLista(uid: string, filtros: Filtros, primeira: Pagina, aoCrescer: (n: number) => void) {
    let atual = primeira;

    return pedidosDeMais$.pipe(
      filter(() => !atual.acabou && !!atual.cursor),
      exhaustMap(() => {
        store.setState({ carregandoMais: true });
        return from(
          repositorio.buscarPagina(uid, { filtros, cursor: atual.cursor, tamanho: tamanhoDaPagina }),
        ).pipe(
          tap((proxima) => {
            atual = {
              itens: [...atual.itens, ...proxima.itens],
              cursor: proxima.cursor ?? atual.cursor,
              acabou: proxima.acabou,
            };
            aoCrescer(atual.itens.length);
            store.setState({
              itens: atual.itens,
              acabou: atual.acabou,
              carregandoMais: false,
              erro: null,
            });
          }),
          catchError(falhar),
        );
      }),
    );
  }

  return {
    store,

    /** Altera parte dos filtros; a lista recarrega se algo de fato mudou. */
    filtrar(parcial: Filtros) {
      const filtros = { ...store.getState().filtros, ...parcial };
      store.setState({ filtros });
      filtros$.next(filtros);
    },

    carregarMais() {
      pedidosDeMais$.next();
    },

    /**
     * Mantém o extrato ativo para o usuário até o retorno ser chamado.
     *
     * Quem conectar primeiro abre a consulta, e ela só fecha quando todos
     * soltarem: o pré-carregamento e a tela do extrato compartilham a mesma lista
     * em vez de cada um buscar a sua.
     */
    conectar(uid: string): () => void {
      if (conexao && conexao.uid !== uid) {
        conexao.encerrar();
        conexao = null;
      }
      conexao ??= { uid, usos: 0, encerrar: abrir(uid) };
      conexao.usos++;

      let solto = false;
      return () => {
        if (solto || conexao?.uid !== uid) return;
        solto = true;
        conexao.usos--;
        if (conexao.usos === 0) {
          conexao.encerrar();
          conexao = null;
        }
      };
    },
  };

  function abrir(uid: string): () => void {
    const assinatura = filtros$
      .pipe(
        distinctUntilChanged(mesmosFiltros),
        tap(() =>
          store.setState({ itens: [], carregandoInicial: true, carregandoMais: false, erro: null }),
        ),
        switchMap((filtros) => {
          let carregados = tamanhoDaPagina;

          return alteracoes$.pipe(
            debounceTime(esperaDeAlteracao),
            startWith(undefined),
            switchMap(() =>
              from(repositorio.buscarPagina(uid, { filtros, tamanho: carregados })).pipe(
                tap((pagina) =>
                  store.setState({
                    itens: pagina.itens,
                    acabou: pagina.acabou,
                    carregandoInicial: false,
                    carregandoMais: false,
                    erro: null,
                  }),
                ),
                switchMap((pagina) =>
                  aoFinalDaLista(uid, filtros, pagina, (n) => {
                    carregados = n;
                  }),
                ),
                catchError(falhar),
              ),
            ),
          );
        }),
      )
      .subscribe();

    return () => {
      assinatura.unsubscribe();
      store.setState(INICIAL, true);
      filtros$.next(INICIAL.filtros);
    };
  }
}
