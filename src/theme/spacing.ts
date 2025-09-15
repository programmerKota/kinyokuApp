// アプリケーション全体で使用するスペーシングの定義
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
  "7xl": 80,
  "8xl": 96,
} as const;

// よく使用されるスペーシングのエイリアス
export const spacingAliases = {
  // コンポーネント間のマージン
  componentMargin: spacing.lg,
  sectionMargin: spacing["3xl"],

  // パディング
  cardPadding: spacing.lg,
  modalPadding: spacing["2xl"],
  screenPadding: spacing.xl,

  // アイコンサイズ
  iconSpacing: spacing.sm,

  // ボタン
  buttonPadding: spacing.lg,
  buttonPaddingSmall: spacing.md,
  buttonPaddingLarge: spacing.xl,
} as const;

export type SpacingKey = keyof typeof spacing;
export type SpacingAliasKey = keyof typeof spacingAliases;

