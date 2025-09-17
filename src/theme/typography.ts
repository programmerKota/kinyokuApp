// アプリケーション全体で使用するタイポグラフィの定義
export const typography = {
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
    '7xl': 72,
    '8xl': 96,
  },

  // Font weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line heights
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter spacing
  letterSpacing: {
    tighter: -0.05,
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1,
  },
} as const;

// よく使用されるタイポグラフィの組み合わせ
export const textStyles = {
  // Headings
  h1: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
    color: 'textPrimary',
  },
  h2: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
    color: 'textPrimary',
  },
  h3: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.snug,
    color: 'textPrimary',
  },
  h4: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.snug,
    color: 'textPrimary',
  },

  // Body text
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
    color: 'textPrimary',
  },
  bodySmall: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
    color: 'textSecondary',
  },
  bodyLarge: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.relaxed,
    color: 'textPrimary',
  },

  // Labels
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'textSecondary',
  },
  labelSmall: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: 'textTertiary',
  },

  // Captions
  caption: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.normal,
    color: 'textTertiary',
  },
} as const;

export type FontSizeKey = keyof typeof typography.fontSize;
export type FontWeightKey = keyof typeof typography.fontWeight;
export type LineHeightKey = keyof typeof typography.lineHeight;
export type LetterSpacingKey = keyof typeof typography.letterSpacing;
export type TextStyleKey = keyof typeof textStyles;
