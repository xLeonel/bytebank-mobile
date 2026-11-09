import type { CacheDeTransacoes } from '@/modules/transactions/application/ports';
import type { Transaction } from '@/modules/transactions/domain/types';
import { armazenamentoDoAparelho } from '@/shared/infrastructure/armazenamentoDoAparelho';

// Sobe quando o formato gravado muda: um cache de outra versão é descartado em vez
// de virar uma lista com campos faltando.
const VERSAO = 1;

const chave = (uid: string) => `bytebank.cache.transacoes.${uid}`;

type TransacaoGravada = Omit<Transaction, 'date' | 'createdAt'> & { date: string; createdAt: string };

/**
 * Última lista de transações, no armazenamento criptografado do aparelho.
 *
 * São dados financeiros: por isso passam pelo mesmo AES-GCM da sessão, e não
 * existem no web, onde não há cofre para a chave.
 */
export const cacheDeTransacoesNoAparelho: CacheDeTransacoes = {
  async ler(uid) {
    const gravado = await armazenamentoDoAparelho.getItem(chave(uid));
    if (!gravado) return null;

    const { versao, transacoes } = JSON.parse(gravado) as {
      versao: number;
      transacoes: TransacaoGravada[];
    };
    if (versao !== VERSAO) return null;

    return transacoes.map((t) => ({ ...t, date: new Date(t.date), createdAt: new Date(t.createdAt) }));
  },

  gravar: (uid, transacoes) =>
    armazenamentoDoAparelho.setItem(chave(uid), JSON.stringify({ versao: VERSAO, transacoes })),

  limpar: (uid) => armazenamentoDoAparelho.removeItem(chave(uid)),
};
