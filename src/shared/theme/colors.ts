// ライト/ダークで切り替え可能なカラーパレット
export type ColorPalette = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  secondaryDark: string;
  secondaryLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;
  white: string;
  black: string;
  gray50: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray400: string;
  gray500: string;
  gray600: string;
  gray700: string;
  gray800: string;
  gray900: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  backgroundPrimary: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  borderPrimary: string;
  borderSecondary: string;
  borderFocus: string;
  shadowLight: string;
  shadowMedium: string;
  shadowDark: string;
};

const lightPalette: ColorPalette = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#93C5FD",
  secondary: "#06B6D4",
  secondaryDark: "#0891B2",
  secondaryLight: "#A5F3FC",
  success: "#22C55E",
  successLight: "#BBF7D0",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  error: "#EF4444",
  errorLight: "#FEE2E2",
  info: "#0EA5E9",
  infoLight: "#E0F2FE",
  white: "#FFFFFF",
  black: "#000000",
  gray50: "#F8FAFC",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray300: "#CBD5E1",
  gray400: "#94A3B8",
  gray500: "#64748B",
  gray600: "#475569",
  gray700: "#334155",
  gray800: "#1E293B",
  gray900: "#0F172A",
  textPrimary: "#000000",
  textSecondary: "#475569",
  textTertiary: "#94A3B8",
  textInverse: "#FFFFFF",
  backgroundPrimary: "#FFFFFF",
  backgroundSecondary: "#FFFFFF",
  backgroundTertiary: "#FFFFFF",
  borderPrimary: "#E2E8F0",
  borderSecondary: "#CBD5E1",
  borderFocus: "#2563EB",
  shadowLight: "rgba(0, 0, 0, 0.1)",
  shadowMedium: "rgba(0, 0, 0, 0.15)",
  shadowDark: "rgba(0, 0, 0, 0.25)",
};

const darkPalette: ColorPalette = {
  primary: "#3B82F6",
  primaryDark: "#1D4ED8",
  primaryLight: "#60A5FA",
  secondary: "#06B6D4",
  secondaryDark: "#0891B2",
  secondaryLight: "#67E8F9",
  success: "#22C55E",
  successLight: "#14532D",
  warning: "#F59E0B",
  warningLight: "#78350F",
  error: "#F87171",
  errorLight: "#7F1D1D",
  info: "#38BDF8",
  infoLight: "#0C4A6E",
  white: "#FFFFFF",
  black: "#000000",
  gray50: "#0F172A",
  gray100: "#111827",
  gray200: "#1F2937",
  gray300: "#374151",
  gray400: "#4B5563",
  gray500: "#6B7280",
  gray600: "#9CA3AF",
  gray700: "#D1D5DB",
  gray800: "#E5E7EB",
  gray900: "#F3F4F6",
  textPrimary: "#FFFFFF",
  textSecondary: "#D1D5DB",
  textTertiary: "#9CA3AF",
  textInverse: "#000000",
  backgroundPrimary: "#000000",
  backgroundSecondary: "#000000",
  backgroundTertiary: "#000000",
  borderPrimary: "#1F2937",
  borderSecondary: "#374151",
  borderFocus: "#3B82F6",
  shadowLight: "rgba(0, 0, 0, 0.4)",
  shadowMedium: "rgba(0, 0, 0, 0.55)",
  shadowDark: "rgba(0, 0, 0, 0.7)",
};

export const colors: ColorPalette = { ...lightPalette };
export const colorSchemes = { light: lightPalette, dark: darkPalette } as const;
export type ColorSchemeName = keyof typeof colorSchemes;
export const applyColorScheme = (scheme: ColorSchemeName) => {
  const palette = colorSchemes[scheme];
  (Object.keys(palette) as Array<keyof ColorPalette>).forEach((k) => {
    (colors as unknown as Record<keyof ColorPalette, string>)[k] = palette[k];
  });
};

export type ColorKey = keyof ColorPalette;
