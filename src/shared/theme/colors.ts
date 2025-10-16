// アプリケーション全体で使用する色の定義
export const colors = {
  // Primary brand
  primary: "#2563EB", // blue-600
  primaryDark: "#1D4ED8", // blue-700
  primaryLight: "#93C5FD", // blue-300

  // Accent / secondary
  secondary: "#06B6D4", // cyan-500
  secondaryDark: "#0891B2", // cyan-600
  secondaryLight: "#A5F3FC", // cyan-200

  // Status
  success: "#22C55E",
  successLight: "#BBF7D0",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  error: "#EF4444",
  errorLight: "#FEE2E2",
  info: "#0EA5E9",
  infoLight: "#E0F2FE",

  // Neutral
  white: "#FFFFFF",
  black: "#000000",
  gray50: "#F8FAFC", // slate-50
  gray100: "#F1F5F9", // slate-100
  gray200: "#E2E8F0", // slate-200
  gray300: "#CBD5E1", // slate-300
  gray400: "#94A3B8", // slate-400
  gray500: "#64748B", // slate-500
  gray600: "#475569", // slate-600
  gray700: "#334155", // slate-700
  gray800: "#1E293B", // slate-800
  gray900: "#0F172A", // slate-900

  // Text
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textTertiary: "#94A3B8",
  textInverse: "#FFFFFF",

  // Background
  backgroundPrimary: "#FFFFFF",
  backgroundSecondary: "#F8FAFC",
  backgroundTertiary: "#F1F5F9",

  // Border
  borderPrimary: "#E2E8F0",
  borderSecondary: "#CBD5E1",
  borderFocus: "#2563EB",

  // Shadows (unchanged)
  shadowLight: "rgba(0, 0, 0, 0.1)",
  shadowMedium: "rgba(0, 0, 0, 0.15)",
  shadowDark: "rgba(0, 0, 0, 0.25)",
} as const;

export type ColorKey = keyof typeof colors;
