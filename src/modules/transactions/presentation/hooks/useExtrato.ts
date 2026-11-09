import { useEffect } from 'react';
import { useStore } from 'zustand';

import { extratoReativo, transacoesEmTempoReal } from '@/composition/container';
import { useAuth } from '@/modules/auth/presentation/AuthContext';
import { iniciarMedicao, marcarPerf } from '@/shared/ui/marcarPerf';

/** Liga o extrato à tela enquanto ela está montada e expõe o estado e os comandos. */
export function useExtrato() {
  const uid = useAuth().user?.uid;

  useEffect(() => {
    if (!uid) return;

    // Pré-carregado, o extrato já chega pronto e não há espera a medir.
    if (!extratoReativo.store.getState().carregandoInicial) marcarPerf('extrato aberto ja carregado');

    let medir = iniciarMedicao('primeira pagina do extrato');
    const pararDeMedir = extratoReativo.store.subscribe((estado, anterior) => {
      if (estado.carregandoInicial && !anterior.carregandoInicial) {
        medir = iniciarMedicao('primeira pagina do extrato');
      } else if (!estado.carregandoInicial && anterior.carregandoInicial) {
        medir();
      }
    });

    const desconectar = extratoReativo.conectar(uid);
    return () => {
      pararDeMedir();
      desconectar();
    };
  }, [uid]);

  const estado = useStore(extratoReativo.store);
  return { ...estado, filtrar: extratoReativo.filtrar, carregarMais: extratoReativo.carregarMais };
}

/**
 * Busca a primeira página do extrato depois que a tela inicial recebe as
 * transações, para a aba já estar pronta no primeiro toque.
 *
 * Espera a resposta do servidor e depois o ócio: começar antes disputaria a rede
 * com a carga da tela inicial, que é a que o usuário está vendo.
 */
export function usePreCarregarExtrato() {
  const uid = useAuth().user?.uid;

  useEffect(() => {
    if (!uid) return;

    let soltar: (() => void) | null = null;
    let pedido: number | null = null;

    function preCarregarNoOcio() {
      pedido = requestIdleCallback(
        () => {
          marcarPerf('extrato pre-carregado');
          soltar = extratoReativo.conectar(uid!);
        },
        { timeout: 2000 },
      );
    }

    // A lista do cache não conta: ela não usa a rede, a do servidor sim.
    const prontas = (e: { carregando: boolean; doCache: boolean }) => !e.carregando && !e.doCache;
    let pararDeEsperar: (() => void) | null = null;
    if (prontas(transacoesEmTempoReal.store.getState())) {
      preCarregarNoOcio();
    } else {
      pararDeEsperar = transacoesEmTempoReal.store.subscribe((estado) => {
        if (!prontas(estado)) return;
        pararDeEsperar?.();
        pararDeEsperar = null;
        preCarregarNoOcio();
      });
    }

    return () => {
      pararDeEsperar?.();
      if (pedido !== null) cancelIdleCallback(pedido);
      soltar?.();
    };
  }, [uid]);
}
