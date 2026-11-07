/**
 * Popula o Firestore com o usuário demo e um histórico de transações.
 *
 * Portado do `seed/seed.js` da Fase 2 (mongosh), com a mesma taxonomia e as
 * mesmas proporções por tipo, para o app mobile ter um perfil de demonstração
 * equivalente ao do web.
 *
 * Usa o **SDK cliente**, não o firebase-admin. Isso evita baixar uma chave de
 * conta de serviço — credencial privilegiada que não deveria circular num repo
 * acadêmico — e tem um efeito colateral bom: o script escreve passando pelas
 * mesmas Security Rules do app, então se ele funciona, as regras estão certas.
 *
 * Idempotente: se o usuário demo já existe, apenas entra e completa o que
 * faltar. Use --limpar para apagar as transações antes de recriar.
 *
 * Uso:
 *   npx tsx scripts/seed.ts
 *   npx tsx scripts/seed.ts --limpar
 *   npx tsx scripts/seed.ts --limpar --volume=2000   (para medir performance)
 */
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';

const DEMO_EMAIL = 'demo@bytebank.com';
const DEMO_SENHA = '123456';
const DEMO_NOME = 'Demo Bytebank';
const DEMO_AGENCIA = '0001';
const DEMO_CONTA = '12345-6';

const MESES = 8;
const VOLUME_PADRAO = 48;
// Limite de operações de um writeBatch no Firestore.
const TAMANHO_DO_LOTE = 500;

function volumePedido(): number {
  const arg = process.argv.find((a: string) => a.startsWith('--volume='));
  const volume = arg ? Number(arg.split('=')[1]) : VOLUME_PADRAO;
  if (!Number.isInteger(volume) || volume <= 0) {
    console.error('--volume precisa ser um inteiro positivo, ex.: --volume=2000');
    process.exit(1);
  }
  return volume;
}

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const descricoesPorTipo: Record<string, string[]> = {
  deposito: ['Salario', 'Freelance', 'Reembolso', 'Venda marketplace', 'Rendimento', 'Bonus'],
  saque: ['Saque caixa eletronico', 'Saque agencia', 'Retirada'],
  pix: [
    'Pix mercado',
    'Pix restaurante',
    'Pix conta de luz',
    'Pix farmacia',
    'Pix combustivel',
    'Transferencia TED',
    'Pagamento aluguel',
    'Transferencia familia',
  ],
};

const categoriaPorDescricao: Record<string, string> = {
  Salario: 'Salário',
  Freelance: 'Serviços',
  Reembolso: 'Outros',
  'Venda marketplace': 'Compras',
  Rendimento: 'Investimentos',
  Bonus: 'Salário',
  'Saque caixa eletronico': 'Outros',
  'Saque agencia': 'Outros',
  Retirada: 'Outros',
  'Pix mercado': 'Alimentação',
  'Pix restaurante': 'Alimentação',
  'Pix conta de luz': 'Moradia',
  'Pix farmacia': 'Saúde',
  'Pix combustivel': 'Transporte',
  'Transferencia TED': 'Outros',
  'Pagamento aluguel': 'Moradia',
  'Transferencia familia': 'Outros',
};

const chavesPix = [
  'mercado@pix.com',
  'restaurante@pix.com',
  '+5511999990000',
  'joao.silva@email.com',
];

const sortear = <T>(lista: T[]): T => lista[Math.floor(Math.random() * lista.length)];
const inteiro = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  const faltando = Object.entries(config).filter(([, v]) => !v).map(([k]) => k);
  if (faltando.length) {
    console.error(`Configuração ausente: ${faltando.join(', ')}`);
    console.error('Rode com as variáveis de .env.local carregadas:');
    console.error('  npx tsx --env-file=.env.local scripts/seed.ts');
    process.exit(1);
  }

  const app = initializeApp(config as Record<string, string>);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Cria a conta demo, ou entra se já existir.
  let uid: string;
  try {
    const cred = await createUserWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_SENHA);
    await updateProfile(cred.user, { displayName: DEMO_NOME });
    uid = cred.user.uid;
    console.log(`[seed] usuario demo criado: ${DEMO_EMAIL} (senha: ${DEMO_SENHA})`);
  } catch (e) {
    if ((e as { code?: string }).code !== 'auth/email-already-in-use') throw e;
    const cred = await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_SENHA);
    uid = cred.user.uid;
    console.log('[seed] usuario demo ja existia — entrando');
  }

  await setDoc(doc(db, 'users', uid), {
    name: DEMO_NOME,
    email: DEMO_EMAIL,
    agency: DEMO_AGENCIA,
    bankAccount: DEMO_CONTA,
  });
  console.log('[seed] perfil gravado');

  const transacoes = collection(db, 'users', uid, 'transactions');

  if (process.argv.includes('--limpar')) {
    const existentes = await getDocs(transacoes);
    await Promise.all(existentes.docs.map((d) => deleteDoc(d.ref)));
    console.log(`[seed] ${existentes.size} transacoes removidas`);
  } else {
    const existentes = await getDocs(transacoes);
    if (existentes.size > 0) {
      console.log(`[seed] ja existem ${existentes.size} transacoes. Use --limpar para recriar.`);
      process.exit(0);
    }
  }

  const agora = new Date();
  const volume = volumePedido();
  const porMes = Math.ceil(volume / MESES);
  let lote = writeBatch(db);
  let criadas = 0;

  for (let m = 0; m < MESES; m++) {
    for (let k = 0; k < porMes && criadas < volume; k++) {
      const r = Math.random();
      let tipo: string;
      let valorBase: number;

      // Mesmas proporcoes do seed da Fase 2: ~35% entradas, ~20% saques,
      // o restante Pix. Da um saldo positivo e graficos com variacao real.
      if (r < 0.35) {
        tipo = 'deposito';
        valorBase = inteiro(50, 6000);
      } else if (r < 0.55) {
        tipo = 'saque';
        valorBase = inteiro(20, 800);
      } else {
        tipo = 'pix';
        valorBase = inteiro(10, 3000);
      }

      const diaMaximo = m === 0 ? Math.max(1, agora.getDate()) : 28;
      let data = new Date(
        agora.getFullYear(),
        agora.getMonth() - m,
        inteiro(1, diaMaximo),
        inteiro(8, 20),
        inteiro(0, 59),
      );
      if (data.getTime() > agora.getTime()) {
        data = new Date(agora.getTime() - inteiro(1, 180) * 60_000);
      }

      const descricao = sortear(descricoesPorTipo[tipo]);
      const doc_: Record<string, unknown> = {
        // O sinal ja vai aplicado: deposito credita, saque e pix debitam.
        amount: tipo === 'deposito' ? valorBase : -valorBase,
        type: tipo,
        date: Timestamp.fromDate(data),
        createdAt: Timestamp.fromDate(data),
        description: descricao,
        category: categoriaPorDescricao[descricao] ?? 'Outros',
        attachments: [],
      };

      if (tipo === 'pix') {
        doc_.pixKey = sortear(chavesPix);
      } else {
        // Saque e deposito acontecem na conta do proprio usuario.
        doc_.agency = DEMO_AGENCIA;
        doc_.account = DEMO_CONTA;
        if (tipo === 'deposito') doc_.depositType = 'own';
      }

      lote.set(doc(transacoes), doc_);
      criadas++;

      if (criadas % TAMANHO_DO_LOTE === 0) {
        await lote.commit();
        lote = writeBatch(db);
        console.log(`[seed] ${criadas}/${volume} transacoes gravadas`);
      }
    }
  }

  await lote.commit();
  console.log(`[seed] ${criadas} transacoes criadas`);
  console.log(`[seed] entre no app com ${DEMO_EMAIL} / ${DEMO_SENHA}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('[seed] falhou:', e.message);
  process.exit(1);
});
