/**
 * Testes do armazenamento criptografado e do bloqueio local, com portas falsas: um
 * Map no lugar do AsyncStorage e um cofre em memória no lugar do Keychain.
 *
 * Rode com:  npm test
 */
import { randomBytes } from '@noble/ciphers/utils.js';

import { criarBloqueio } from '@/modules/auth/application/bloqueio';
import { validarSenhaNova } from '@/modules/auth/domain/senha';
import {
  criarArmazenamentoCriptografado,
  criarObtencaoDeChave,
  type ArmazenamentoDeTexto,
} from '@/shared/infrastructure/armazenamentoCriptografado';

import { eq, finalizar } from './harness';

const gerarBytes = (n: number) => randomBytes(n);

function baseEmMemoria() {
  const itens = new Map<string, string>();
  const base: ArmazenamentoDeTexto = {
    getItem: async (k) => itens.get(k) ?? null,
    setItem: async (k, v) => void itens.set(k, v),
    removeItem: async (k) => void itens.delete(k),
  };
  return { itens, base };
}

function cofreEmMemoria() {
  let guardada: string | null = null;
  let gravacoes = 0;
  return {
    cofre: {
      ler: async () => guardada,
      gravar: async (c: string) => {
        guardada = c;
        gravacoes++;
      },
    },
    gravacoes: () => gravacoes,
  };
}

function montar(base: ArmazenamentoDeTexto, chave?: Uint8Array) {
  const fixa = chave ?? gerarBytes(32);
  return criarArmazenamentoCriptografado({ base, gerarBytes, obterChave: async () => fixa });
}

const SESSAO = '{"stsTokenManager":{"refreshToken":"segredo-do-usuario"}}';

async function testarArmazenamento() {
  console.log('--- armazenamento criptografado ---');

  {
    const { itens, base } = baseEmMemoria();
    const seguro = montar(base);
    await seguro.setItem('sessao', SESSAO);

    eq('devolve o valor original', await seguro.getItem('sessao'), SESSAO);
    eq('o token nao aparece no que foi gravado', itens.get('sessao')!.includes('segredo'), false);
    eq('item ausente devolve null', await seguro.getItem('outro'), null);

    const primeiro = itens.get('sessao');
    await seguro.setItem('sessao', SESSAO);
    eq('mesmo valor gera cifra diferente', itens.get('sessao') !== primeiro, true);

    await seguro.removeItem('sessao');
    eq('remover apaga o item', itens.has('sessao'), false);
  }

  {
    const { itens, base } = baseEmMemoria();
    itens.set('sessao', SESSAO);
    const seguro = montar(base);

    eq('sessao antiga em texto puro continua valendo', await seguro.getItem('sessao'), SESSAO);
    eq('sessao antiga e cifrada na leitura', itens.get('sessao')!.includes('segredo'), false);
    eq('segue legivel depois de cifrada', await seguro.getItem('sessao'), SESSAO);
  }

  {
    const { itens, base } = baseEmMemoria();
    const seguro = montar(base);
    await seguro.setItem('a', SESSAO);

    itens.set('b', itens.get('a')!);
    eq('valor copiado para outro item nao abre', await seguro.getItem('b'), null);
    eq('item invalido e descartado', itens.has('b'), false);

    const valor = itens.get('a')!;
    const ultimo = valor.at(-1) === '0' ? '1' : '0';
    itens.set('a', valor.slice(0, -1) + ultimo);
    eq('valor adulterado nao abre', await seguro.getItem('a'), null);
  }

  {
    const { base } = baseEmMemoria();
    await montar(base).setItem('sessao', SESSAO);
    eq('outra chave nao abre', await montar(base).getItem('sessao'), null);
  }
}

async function testarChave() {
  console.log('\n--- chave no cofre ---');
  const { cofre, gravacoes } = cofreEmMemoria();
  const obter = criarObtencaoDeChave(cofre, gerarBytes);

  const [a, b] = await Promise.all([obter(), obter()]);
  eq('chamadas simultaneas usam a mesma chave', a === b, true);
  eq('a chave e gravada uma vez', gravacoes(), 1);
  eq('a chave tem 256 bits', a.length, 32);

  const depois = await criarObtencaoDeChave(cofre, gerarBytes)();
  eq('ao reabrir o app recupera a mesma chave', Array.from(depois), Array.from(a));
  eq('nao grava outra chave ao reabrir', gravacoes(), 1);

  let tentativas = 0;
  const instavel = criarObtencaoDeChave(
    {
      ler: async () => {
        tentativas++;
        if (tentativas === 1) throw new Error('cofre indisponivel');
        return null;
      },
      gravar: async () => {},
    },
    gerarBytes,
  );
  await instavel().catch(() => {});
  eq('falha do cofre nao trava as proximas tentativas', (await instavel()).length, 32);
}

function montarBloqueio({ disponivel = true, aceita = true } = {}) {
  let pedidos = 0;
  const bloqueio = criarBloqueio(
    {
      disponivel: async () => disponivel,
      autenticar: async () => {
        pedidos++;
        return aceita;
      },
    },
    1000,
  );
  return { bloqueio, estado: () => bloqueio.store.getState(), pedidos: () => pedidos };
}

async function testarBloqueio() {
  console.log('\n--- bloqueio local ---');

  {
    const { bloqueio, estado } = montarBloqueio();
    await bloqueio.aoRestaurarSessao();
    eq('sessao restaurada abre bloqueada', estado().bloqueado, true);
    await bloqueio.desbloquear();
    eq('autenticar desbloqueia', estado().bloqueado, false);
  }

  {
    const { bloqueio, estado } = montarBloqueio();
    bloqueio.aoEntrar();
    eq('login recem-feito nao bloqueia', estado().bloqueado, false);

    bloqueio.aoPerderFoco();
    eq('sem foco a tela fica coberta', estado().oculto, true);
    await bloqueio.aoVoltar(5000);
    eq('so perder o foco nao bloqueia', estado().bloqueado, false);
    eq('voltar descobre a tela', estado().oculto, false);

    bloqueio.aoIrParaSegundoPlano(1000);
    await bloqueio.aoVoltar(1999);
    eq('saida curta nao bloqueia', estado().bloqueado, false);

    bloqueio.aoIrParaSegundoPlano(1000);
    await bloqueio.aoVoltar(2000);
    eq('saida longa bloqueia', estado().bloqueado, true);
  }

  {
    const { bloqueio, estado, pedidos } = montarBloqueio({ aceita: false });
    await bloqueio.aoRestaurarSessao();
    await bloqueio.desbloquear();
    eq('cancelar mantem bloqueado', estado().bloqueado, true);
    eq('pede uma vez por tentativa', pedidos(), 1);

    bloqueio.aoSair();
    eq('sair libera a tela de login', estado().bloqueado, false);
    bloqueio.aoIrParaSegundoPlano(0);
    eq('sem sessao nao cobre a tela', estado().oculto, false);
  }

  {
    const { bloqueio, estado } = montarBloqueio({ disponivel: false });
    await bloqueio.aoRestaurarSessao();
    eq('aparelho sem trava nao bloqueia', estado().bloqueado, false);
  }
}

function testarSenha() {
  console.log('\n--- senha de conta nova ---');
  eq('senha curta e recusada', validarSenhaNova('abc123').valid, false);
  eq('so digitos e recusada', validarSenhaNova('12345678').valid, false);
  eq('so letras e recusada', validarSenhaNova('abcdefgh').valid, false);
  eq('letras e numeros sao aceitos', validarSenhaNova('abcd1234').valid, true);
}

async function main() {
  await testarArmazenamento();
  await testarChave();
  await testarBloqueio();
  testarSenha();
  finalizar();
}

main();
