/**
 * Categorias + sugestão automática por palavra-chave da descrição.
 * Portado da Fase 2 sem alteração — é TypeScript puro, sem dependência de DOM.
 * A sugestão é só um palpite; o usuário sempre pode trocar no formulário.
 */
export const CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Lazer',
  'Saúde',
  'Educação',
  'Compras',
  'Serviços',
  'Salário',
  'Investimentos',
  'Outros',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Mapa categoria -> palavras-chave que a sugerem (busca em minúsculas). */
const KEYWORDS: Record<Category, string[]> = {
  Alimentação: ['mercado', 'supermercado', 'ifood', 'restaurante', 'lanche', 'padaria', 'food', 'bar', 'cafe', 'café'],
  Transporte: ['uber', '99', 'gasolina', 'combustivel', 'combustível', 'onibus', 'ônibus', 'metro', 'metrô', 'passagem', 'estacionamento', 'pedagio', 'pedágio'],
  Moradia: ['aluguel', 'condominio', 'condomínio', 'luz', 'energia', 'agua', 'água', 'gas', 'gás', 'internet', 'iptu'],
  Lazer: ['cinema', 'netflix', 'spotify', 'show', 'viagem', 'jogo', 'game', 'streaming', 'bar', 'balada'],
  Saúde: ['farmacia', 'farmácia', 'remedio', 'remédio', 'medico', 'médico', 'consulta', 'hospital', 'plano de saude', 'dentista', 'academia'],
  Educação: ['curso', 'faculdade', 'escola', 'livro', 'mensalidade', 'fiap', 'udemy', 'alura'],
  Compras: ['amazon', 'mercado livre', 'shopping', 'loja', 'roupa', 'magalu', 'aliexpress', 'shopee'],
  Serviços: ['assinatura', 'taxa', 'tarifa', 'servico', 'serviço', 'manutencao', 'manutenção'],
  Salário: ['salario', 'salário', 'pagamento', 'holerite', 'proventos', 'pró-labore', 'pro-labore'],
  Investimentos: ['investimento', 'cdb', 'acao', 'ação', 'acoes', 'ações', 'tesouro', 'fii', 'renda fixa', 'bitcoin', 'cripto'],
  Outros: [],
};

/** Sugere uma categoria a partir da descrição. Retorna 'Outros' se nada casar. */
export function suggestCategory(description: string | undefined | null): Category {
  const text = (description ?? '').toLowerCase().trim();
  if (!text) return 'Outros';
  for (const category of CATEGORIES) {
    if (KEYWORDS[category].some((kw) => text.includes(kw))) {
      return category;
    }
  }
  return 'Outros';
}

/** Valida se a categoria informada pertence à lista conhecida. */
export function isValidCategory(value: string | undefined | null): value is Category {
  return !!value && (CATEGORIES as readonly string[]).includes(value);
}
