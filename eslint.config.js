// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

const FRAMEWORKS = [
  'react', 'react/*',
  'react-native', 'react-native/*', 'react-native-*', '@react-native-*/*',
  'firebase', 'firebase/*', '@firebase/*',
  'expo', 'expo/*', 'expo-*', 'expo-*/*', '@expo/*',
];
const PROVEDORES = ['firebase', 'firebase/*', '@firebase/*'];
const camada = (nome) => [`**/${nome}`, `**/${nome}/**`];

const proibir = (...regras) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: regras.map(([group, motivo]) => ({ group, message: motivo })),
    },
  ],
});

const SEM_FRAMEWORK = [FRAMEWORKS, 'Domínio e aplicação são TypeScript puro, sem framework.'];
const SEM_INFRA = [camada('infrastructure'), 'Dependa da porta; quem conhece a implementação é composition/container.'];
const SEM_PROVEDOR = [PROVEDORES, 'O Firebase fica atrás das portas, em infrastructure.'];
const SEM_APRESENTACAO = [camada('presentation'), 'Apresentação depende das camadas internas, nunca o contrário.'];
const SEM_UI = [camada('ui'), 'Apresentação depende das camadas internas, nunca o contrário.'];
const SEM_COMPOSICAO = [camada('composition'), 'Só a apresentação acessa a raiz de composição.'];
const SEM_APLICACAO = [camada('application'), 'Domínio não conhece os casos de uso.'];
const SEM_MODULOS = [['@/modules/*', '@/modules/**', '**/modules/**'], 'shared não pode depender de um módulo.'];

// A regra de dependência da Clean Architecture: as setas só apontam para dentro.
// `no-restricted-imports` é sobrescrita por inteiro em cada bloco, então cada um
// lista tudo o que a sua camada não pode importar.
const camadas = [
  {
    files: ['src/modules/*/domain/**'],
    rules: proibir(SEM_FRAMEWORK, SEM_APLICACAO, SEM_INFRA, SEM_APRESENTACAO, SEM_UI, SEM_COMPOSICAO),
  },
  {
    files: ['src/shared/domain/**'],
    rules: proibir(SEM_FRAMEWORK, SEM_APLICACAO, SEM_INFRA, SEM_APRESENTACAO, SEM_UI, SEM_COMPOSICAO, SEM_MODULOS),
  },
  {
    files: ['src/modules/*/application/**'],
    rules: proibir(SEM_FRAMEWORK, SEM_INFRA, SEM_APRESENTACAO, SEM_UI, SEM_COMPOSICAO),
  },
  {
    files: ['src/modules/*/infrastructure/**'],
    rules: proibir(SEM_APRESENTACAO, SEM_UI, SEM_COMPOSICAO),
  },
  {
    files: ['src/shared/infrastructure/**'],
    rules: proibir(SEM_APRESENTACAO, SEM_UI, SEM_COMPOSICAO, SEM_MODULOS),
  },
  {
    files: ['src/modules/*/presentation/**'],
    rules: proibir(SEM_PROVEDOR, SEM_INFRA),
  },
  {
    files: ['src/shared/ui/**'],
    rules: proibir(SEM_PROVEDOR, SEM_INFRA, SEM_COMPOSICAO, SEM_MODULOS),
  },
  {
    files: ['src/app/**'],
    rules: proibir(SEM_PROVEDOR, SEM_INFRA, SEM_COMPOSICAO),
  },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  ...camadas,
]);
