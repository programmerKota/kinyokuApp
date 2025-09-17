// アプリケーション全体で使用する色の定義
export const colors = {
  // Primary colors
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#A5B4FC',

  // Secondary colors
  secondary: '#8B5CF6',
  secondaryDark: '#7C3AED',
  secondaryLight: '#C4B5FD',

  // Status colors
  success: '#10B981',
  successLight: '#A7F3D0',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Text colors
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Background colors
  backgroundPrimary: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  backgroundTertiary: '#F3F4F6',

  // Border colors
  borderPrimary: '#E5E7EB',
  borderSecondary: '#D1D5DB',
  borderFocus: '#6366F1',

  // Shadow colors
  shadowLight: 'rgba(0, 0, 0, 0.1)',
  shadowMedium: 'rgba(0, 0, 0, 0.15)',
  shadowDark: 'rgba(0, 0, 0, 0.25)',
} as const;

export type ColorKey = keyof typeof colors;
