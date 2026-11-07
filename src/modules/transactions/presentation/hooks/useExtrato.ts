import { useEffect } from 'react';
import { useStore } from 'zustand';

import { extratoReativo } from '@/composition/container';
import { useAuth } from '@/modules/auth/presentation/AuthContext';
import { iniciarMedicao } from '@/shared/ui/marcarPerf';

/** Liga o extrato à tela enquanto ela está montada e expõe o estado e os comandos. */
export function useExtrato() {
  const uid = useAuth().user?.uid;

  useEffect(() => {
    if (!uid) return;

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
