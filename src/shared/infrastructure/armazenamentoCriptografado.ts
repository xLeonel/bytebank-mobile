import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from '@noble/ciphers/utils.js';

const PREFIXO = 'enc1:';
const BYTES_DA_CHAVE = 32;
const BYTES_DO_NONCE = 12;

export type ArmazenamentoDeTexto = {
  getItem: (chave: string) => Promise<string | null>;
  setItem: (chave: string, valor: string) => Promise<void>;
  removeItem: (chave: string) => Promise<void>;
};

/** Onde a chave de criptografia fica guardada, separada dos dados que ela protege. */
export type Cofre = {
  ler: () => Promise<string | null>;
  gravar: (chaveEmHex: string) => Promise<void>;
};

type GerarBytes = (tamanho: number) => Uint8Array;

/**
 * Lê a chave do cofre, ou cria uma na primeira vez.
 *
 * Guarda a promessa, não o resultado: chamadas simultâneas no boot esperam a mesma
 * leitura em vez de cada uma gerar uma chave diferente e sobrescrever a outra.
 */
export function criarObtencaoDeChave(cofre: Cofre, gerarBytes: GerarBytes) {
  let chave: Promise<Uint8Array> | null = null;

  async function lerOuCriar(): Promise<Uint8Array> {
    const existente = await cofre.ler();
    if (existente) return hexToBytes(existente);

    const nova = gerarBytes(BYTES_DA_CHAVE);
    await cofre.gravar(bytesToHex(nova));
    return nova;
  }

  return () => {
    chave ??= lerOuCriar().catch((erro) => {
      chave = null; // Uma falha do cofre não pode travar as próximas tentativas.
      throw erro;
    });
    return chave;
  };
}

type Dependencias = {
  base: ArmazenamentoDeTexto;
  obterChave: () => Promise<Uint8Array>;
  gerarBytes: GerarBytes;
};

/**
 * Armazenamento que grava só texto cifrado, com AES-256-GCM.
 *
 * O AsyncStorage não é criptografado, e o Keychain/Keystore tem limite de tamanho
 * pequeno demais para a sessão do Firebase. Por isso os dados ficam no primeiro e
 * apenas a chave no segundo. O GCM detecta adulteração, e o nome do item entra como
 * dado autenticado: um valor copiado para outro item não abre.
 */
export function criarArmazenamentoCriptografado({
  base,
  obterChave,
  gerarBytes,
}: Dependencias): ArmazenamentoDeTexto {
  async function setItem(chave: string, valor: string) {
    const nonce = gerarBytes(BYTES_DO_NONCE);
    const cifrado = gcm(await obterChave(), nonce, utf8ToBytes(chave)).encrypt(utf8ToBytes(valor));
    await base.setItem(chave, `${PREFIXO}${bytesToHex(nonce)}:${bytesToHex(cifrado)}`);
  }

  return {
    setItem,
    removeItem: base.removeItem,

    async getItem(chave) {
      const guardado = await base.getItem(chave);
      if (guardado === null) return null;

      // Valor em texto puro, gravado antes desta versão: cifra agora, sem exigir
      // que o usuário entre de novo e sem deixar a sessão antiga exposta.
      if (!guardado.startsWith(PREFIXO)) {
        await setItem(chave, guardado);
        return guardado;
      }

      try {
        const [nonce, cifrado] = guardado.slice(PREFIXO.length).split(':');
        const aberto = gcm(await obterChave(), hexToBytes(nonce), utf8ToBytes(chave)).decrypt(
          hexToBytes(cifrado),
        );
        return bytesToUtf8(aberto);
      } catch {
        // Valor adulterado ou chave perdida: não há o que recuperar. Equivale a
        // "sem sessão", que leva ao login em vez de derrubar o app ao abrir.
        await base.removeItem(chave);
        return null;
      }
    },
  };
}
