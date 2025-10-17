import type { ViewStyle, TextStyle } from "react-native";

import { spacing, typography } from "@shared/theme";
import type { ColorPalette } from "@shared/theme/colors";

// よく使用されるスタイルパターンのユーティリティ関数

// ボタンスタイルの共通パターン（動的colors対応）
export const createButtonStyle = (
  variant: "primary" | "secondary" | "danger" = "primary",
  size: "small" | "medium" | "large" = "medium",
  colors: ColorPalette,
) => {
  const baseStyle: ViewStyle = {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  };

  const variantStyles = {
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.borderPrimary,
    },
    danger: {
      backgroundColor: colors.error,
    },
  };

  const sizeStyles = {
    small: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    medium: {
      paddingHorizontal: spacing["2xl"],
      paddingVertical: spacing.lg,
    },
    large: {
      paddingHorizontal: spacing["3xl"],
      paddingVertical: spacing.xl,
    },
  };

  return {
    ...baseStyle,
    ...variantStyles[variant],
    ...sizeStyles[size],
  };
};

// テキストスタイルの共通パターン（動的colors対応）
export const createTextStyle = (
  size: keyof typeof typography.fontSize = "base",
  weight: keyof typeof typography.fontWeight = "normal",
  colorKey: keyof ColorPalette = "textPrimary",
  colors: ColorPalette,
): TextStyle => ({
  fontSize: typography.fontSize[size],
  fontWeight: typography.fontWeight[weight],
  color: colors[colorKey],
});
// （未使用の共通スタイル群は削除しました）
