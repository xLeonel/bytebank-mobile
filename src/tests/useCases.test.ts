/**
 * Testes dos casos de uso, com portas falsas em memória: rodam sem Firebase,
 * sem emulador e sem React, que é o ganho de depender só das portas.
 *
 * Rode com:  npm test
 */
import { criarCasosDeUsoDeAutenticacao } from '@/modules/auth/application/authUseCases';
import type { AuthGateway } from '@/modules/auth/application/ports';
import type { ProfileRepository } from '@/modules/profile/application/ports';
import { criarCasosDeUsoDePerfil } from '@/modules/profile/application/profileUseCases';
import type { UserProfile } from '@/modules/profile/domain/profile';
import type {
  ReceiptStorage,
  TransactionRepository,
} from '@/modules/transactions/application/ports';
import { criarCasosDeUsoDeTransacoes } from '@/modules/transactions/application/transactionUseCases';
import type { Attachment, TransactionRecord } from '@/modules/transactions/domain/types';

import { eq, finalizar } from './harness';

function repositorioFalso() {
  const criados: TransactionRecord[] = [];
  const atualizados: TransactionRecord[] = [];
  const anexos: Attachment[] = [];
  const removidos: Attachment[] = [];
  const repositorio = {
    criar: async (_uid, registro) => {
      criados.push(registro);
      return 'tx1';
    },
    atualizar: async (_uid, _id, registro) => {
      atualizados.push(registro);
    },
    adicionarAnexo: async (_uid, _id, anexo) => {
      anexos.push(anexo);
    },
    removerAnexo: async (_uid, _id, anexo) => {
      removidos.push(anexo);
    },
  } as Partial<TransactionRepository> as TransactionRepository;
  return { repositorio, criados, atualizados, anexos, removidos };
}

function recibosFalsos({ falhar = false } = {}) {
  const removidos: string[] = [];
  const recibos: ReceiptStorage = {
    enviar: async (uid, txId, _uri, nome) => {
      if (falhar) throw new Error('sem rede');
      return { path: `users/${uid}/receipts/${txId}/${nome}`, url: 'https://arquivo' };
    },
    remover: async (path) => {
      removidos.push(path);
    },
  };
  return { recibos, removidos };
}

const hoje = new Date(2026, 7, 15);

async function testarTransacoes() {
  console.log('--- transacoes ---');

  {
    const { repositorio, criados, anexos } = repositorioFalso();
    const { recibos } = recibosFalsos();
    const casos = criarCasosDeUsoDeTransacoes({ repositorio, recibos });

    const r = await casos.registrar('u1', { type: 'pix', amount: 50, date: hoje, pixKey: 'a@b' });
    eq('o valor chega com sinal ao repositorio', criados[0].amount, -50);
    eq('sem recibo nao ha anexo', anexos.length, 0);
    eq('sem recibo nao ha erro', r, { id: 'tx1' });
  }

  {
    const { repositorio, anexos } = repositorioFalso();
    const { recibos } = recibosFalsos();
    const casos = criarCasosDeUsoDeTransacoes({ repositorio, recibos });

    await casos.registrar('u1', { type: 'saque', amount: 5, date: hoje }, 'file://foto.jpg');
    eq('o recibo fica amarrado a transacao criada', anexos[0].path.startsWith('users/u1/receipts/tx1/'), true);
    eq('anexo de imagem recebe o MIME certo', anexos[0].type, 'image/jpeg');
  }

  {
    const { repositorio, criados } = repositorioFalso();
    const { recibos } = recibosFalsos({ falhar: true });
    const casos = criarCasosDeUsoDeTransacoes({ repositorio, recibos });

    const r = await casos.registrar('u1', { type: 'saque', amount: 5, date: hoje }, 'file://foto.jpg');
    eq('falha no upload nao desfaz a transacao', criados.length, 1);
    eq('falha no upload volta no resultado', r.erroDoRecibo?.message, 'sem rede');
  }

  {
    const { repositorio, atualizados } = repositorioFalso();
    const { recibos } = recibosFalsos();
    const casos = criarCasosDeUsoDeTransacoes({ repositorio, recibos });

    await casos.atualizar('u1', 'tx1', { type: 'deposito', depositType: 'other', amount: 9, date: hoje });
    eq('a edicao tambem reaplica o sinal', atualizados[0].amount, -9);
  }

  {
    const { repositorio, removidos: referencias } = repositorioFalso();
    const { recibos, removidos: arquivos } = recibosFalsos();
    const casos = criarCasosDeUsoDeTransacoes({ repositorio, recibos });

    const anexo: Attachment = { name: 'r.jpg', type: 'image/jpeg', path: 'p/r.jpg', url: 'u' };
    await casos.removerRecibo('u1', 'tx1', anexo);
    eq('remover recibo apaga o arquivo', arquivos, ['p/r.jpg']);
    eq('remover recibo apaga a referencia', referencias.length, 1);
  }
}

function perfilFalso(existente: UserProfile | null) {
  const salvos: UserProfile[] = [];
  const repositorio: ProfileRepository = {
    buscar: async () => existente,
    salvar: async (_uid, perfil) => {
      salvos.push(perfil);
    },
    mesclar: async () => {},
  };
  return { repositorio, salvos };
}

const avatares = { enviar: async () => 'https://foto' };

async function testarPerfil() {
  console.log('\n--- perfil ---');
  const usuario = { uid: 'u1', email: 'a@b.com', displayName: 'Ana' };

  {
    const atual: UserProfile = { name: 'Ana', email: 'a@b.com', agency: '0001', bankAccount: '12345-6' };
    const { repositorio, salvos } = perfilFalso(atual);
    const casos = criarCasosDeUsoDePerfil({ repositorio, avatares });

    eq('perfil existente e devolvido', await casos.carregarOuRecuperar(usuario), atual);
    eq('perfil existente nao e regravado', salvos.length, 0);
  }

  {
    const { repositorio, salvos } = perfilFalso(null);
    const casos = criarCasosDeUsoDePerfil({ repositorio, avatares });

    const recuperado = await casos.carregarOuRecuperar(usuario);
    eq('perfil ausente e recriado com o nome da sessao', recuperado.name, 'Ana');
    eq('perfil ausente e gravado', salvos.length, 1);
    eq('conta gerada tem o formato esperado', /^\d{5}-\d$/.test(recuperado.bankAccount), true);
  }

  {
    const { repositorio, salvos } = perfilFalso(null);
    const casos = criarCasosDeUsoDePerfil({ repositorio, avatares });

    await casos.criarInicial('u1', '  Ana  ', ' a@b.com ');
    eq('cadastro grava nome sem espacos', salvos[0].name, 'Ana');
    eq('cadastro grava e-mail sem espacos', salvos[0].email, 'a@b.com');
  }
}

async function testarAutenticacao() {
  console.log('\n--- autenticacao ---');
  const chamadas: string[][] = [];
  const gateway = {
    entrar: async (email, senha) => {
      chamadas.push([email, senha]);
    },
    criarConta: async (nome, email, senha) => {
      chamadas.push([nome, email, senha]);
      return { uid: 'u1', email, displayName: nome };
    },
  } as Partial<AuthGateway> as AuthGateway;
  const casos = criarCasosDeUsoDeAutenticacao(gateway);

  await casos.entrar(' a@b.com ', ' senha ');
  eq('entrar limpa o e-mail e preserva a senha', chamadas[0], ['a@b.com', ' senha ']);

  await casos.cadastrar(' Ana ', ' a@b.com ', 'segredo');
  eq('cadastrar limpa nome e e-mail', chamadas[1], ['Ana', 'a@b.com', 'segredo']);
}

async function main() {
  await testarTransacoes();
  await testarPerfil();
  await testarAutenticacao();
  finalizar();
}

main();
