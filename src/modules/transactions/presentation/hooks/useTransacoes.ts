import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';

import { casosDeTransacoes, transacoesEmTempoReal } from '@/composition/container';
import { useAuth } from '@/modules/auth/presentation/AuthContext';
import type { EstadoDasTransacoes } from '@/modules/transactions/application/transactionsStore';
import type { TransactionInput } from '@/modules/transactions/domain/types';
import { iniciarMedicao } from '@/shared/ui/marcarPerf';

/**
 * Mantém as transações em dia enquanto há sessão.
 *
 * Fica no layout da área logada, e não na raiz, porque a assinatura do Firestore
 * depende de um usuário autenticado: começar acima do guard faria a consulta
 * disparar antes da sessão existir, resultando em permission-denied.
 */
export function useSincronizarTransacoes() {
  const uid = useAuth().user?.uid;

  useEffect(() => {
    if (!uid) return;

    const medir = iniciarMedicao('primeira carga das transacoes');
    const pararDeMedir = transacoesEmTempoReal.store.subscribe((estado) => {
      if (estado.carregando) return;
      medir();
      pararDeMedir();
    });

    const encerrar = transacoesEmTempoReal.sincronizar(uid);
    return () => {
      pararDeMedir();
      encerrar();
    };
  }, [uid]);
}

/**
 * Lê uma parte das transações. A tela só renderiza de novo quando o valor
 * escolhido muda: quem lê o saldo não reage a uma mudança em outro campo.
 */
export function useTransacoes<T>(selecionar: (estado: EstadoDasTransacoes) => T): T {
  return useStore(transacoesEmTempoReal.store, selecionar);
}

/**
 * Operações sobre as transações do usuário da sessão.
 *
 * Não assina a lista: formulários que só gravam não renderizam de novo a cada
 * atualização que chega do Firestore. Sem escrita otimista: o `onSnapshot` já
 * atualiza a lista local antes de confirmar com o servidor, e duplicar isso à mão
 * criaria o risco de item fantasma quando a escrita falha.
 */
export function useAcoesDeTransacao() {
  const uid = useAuth().user?.uid;

  return useMemo(() => {
    function exigirUsuario() {
      if (!uid) throw new Error('Sessão expirada. Entre novamente.');
      return uid;
    }

    return {
      /** Com `uriRecibo`, também anexa o comprovante; ver `registrar` nos casos de uso. */
      criar: (entrada: TransactionInput, uriRecibo?: string | null) =>
        casosDeTransacoes.registrar(exigirUsuario(), entrada, uriRecibo),
      atualizar: (id: string, entrada: TransactionInput) =>
        casosDeTransacoes.atualizar(exigirUsuario(), id, entrada),
      remover: (id: string) => casosDeTransacoes.remover(exigirUsuario(), id),
    };
  }, [uid]);
}
