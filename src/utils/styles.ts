import { ViewStyle, TextStyle } from "react-native";
import { colors, spacing, typography } from "../theme";

// よく使用されるスタイルパターンのユーティリティ関数

// ボタンスタイルの共通パターン
export const createButtonStyle = (
  variant: "primary" | "secondary" | "danger" = "primary",
  size: "small" | "medium" | "large" = "medium"
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

// テキストスタイルの共通パターン
export const createTextStyle = (
  size: keyof typeof typography.fontSize = "base",
  weight: keyof typeof typography.fontWeight = "normal",
  color: keyof typeof colors = "textPrimary"
): TextStyle => ({
  fontSize: typography.fontSize[size],
  fontWeight: typography.fontWeight[weight],
  color: colors[color],
});
// （未使用の共通スタイル群は削除しました）
