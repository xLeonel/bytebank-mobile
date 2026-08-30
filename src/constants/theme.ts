/**
 * Identidade visual do Bytebank, herdada do Design System da Fase 2
 * (@xleonel/bytebank-design-system): verde escuro como cor primária, âmbar
 * como destaque/ação. Os tokens vêm de lá para o app mobile e o web parecerem
 * o mesmo produto.
 */
export const Colors = {
  /** Verde da marca — fundo do card de saldo, botões primários, header. */
  primary: '#374C34',
  primaryDark: '#2A3A28',
  /** Âmbar — destaque, links e a ação principal sobre o verde. */
  warning: '#F59E0B',

  /**
   * Fundo geral das telas logadas.
   *
   * Mais saturado que o verde do web (#E7EFE5): aquele tom depende da
   * calibração da tela e em muitos celulares lê como branco, apagando a
   * distinção entre o fundo e os cards brancos.
   */
  background: '#D4E2CF',
  surface: '#FFFFFF',

  text: '#1E293B',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  onPrimary: '#FFFFFF',

  border: '#CBD5E1',
  borderLight: '#F1F5F9',

  /** Crédito (entrada) e débito (saída) nas listas e gráficos. */
  credito: '#16A34A',
  debito: '#DC2626',

  error: '#DC2626',
  success: '#16A34A',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  hero: 32,
} as const;
