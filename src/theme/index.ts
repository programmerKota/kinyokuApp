// テーマシステムの統合エクスポート
export { colors } from './colors';
export { spacing, spacingAliases } from './spacing';
export { typography, textStyles } from './typography';
export { shadows } from './shadows';

// テーマオブジェクトの統合
import { colors } from './colors';
import { shadows } from './shadows';
import { spacing, spacingAliases } from './spacing';
import { typography, textStyles } from './typography';

export const theme = {
  colors,
  spacing,
  spacingAliases,
  typography,
  textStyles,
  shadows,
} as const;

export type Theme = typeof theme;
