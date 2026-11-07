import { criarCasosDeUsoDeAutenticacao } from '@/modules/auth/application/authUseCases';
import { firebaseAuthGateway } from '@/modules/auth/infrastructure/firebaseAuthGateway';
import { criarCasosDeUsoDePerfil } from '@/modules/profile/application/profileUseCases';
import { firebaseAvatarStorage } from '@/modules/profile/infrastructure/firebaseAvatarStorage';
import { firestoreProfileRepository } from '@/modules/profile/infrastructure/firestoreProfileRepository';
import { criarStoreDoExtrato } from '@/modules/transactions/application/extratoStore';
import { criarStoreDasTransacoes } from '@/modules/transactions/application/transactionsStore';
import { criarCasosDeUsoDeTransacoes } from '@/modules/transactions/application/transactionUseCases';
import { firebaseReceiptStorage } from '@/modules/transactions/infrastructure/firebaseReceiptStorage';
import { firestoreTransactionRepository } from '@/modules/transactions/infrastructure/firestoreTransactionRepository';

/**
 * Raiz de composição: o único lugar que conhece as duas pontas, os casos de uso
 * e as implementações em Firebase. Trocar de provedor, ou colocar um cache na
 * frente do repositório, muda só este arquivo.
 */
export const casosDeAutenticacao = criarCasosDeUsoDeAutenticacao(firebaseAuthGateway);

export const casosDePerfil = criarCasosDeUsoDePerfil({
  repositorio: firestoreProfileRepository,
  avatares: firebaseAvatarStorage,
});

export const casosDeTransacoes = criarCasosDeUsoDeTransacoes({
  repositorio: firestoreTransactionRepository,
  recibos: firebaseReceiptStorage,
});

export const transacoesEmTempoReal = criarStoreDasTransacoes(firestoreTransactionRepository);

export const extratoReativo = criarStoreDoExtrato({
  repositorio: firestoreTransactionRepository,
  alteracoes$: transacoesEmTempoReal.alteracoes$,
});
