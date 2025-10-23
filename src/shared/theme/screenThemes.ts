import type { ColorPalette } from "./colors";

export type ScreenTheme = {
  accent: string;
  tintSoft: string;
  cardBg: string;
  badgeBg?: string;
  badgeText?: string;
};

// 動的テーマ生成関数
export const createScreenThemes = (colors: ColorPalette) => ({
  // 認証画面: 落ち着いたブルー基調 + ソフトな青系背景
  auth: {
    accent: "#1a73e8", // Google系ブルーに合わせたアクセント
    tintSoft: colors.primary === "#2563EB" ? "#EFF6FF" : "#1F2937", // ライト: blue-50, ダーク: gray-800
    cardBg: colors.backgroundSecondary,
  },

  // 履歴画面: カードは落ち着いた情報色ブルー、微細要素は白/淡色
  history: {
    accent: colors.info,
    tintSoft: "rgba(255,255,255,0.1)",
    cardBg: colors.info,
    badgeBg: "rgba(255,255,255,0.2)",
    badgeText: colors.white,
  },

  // 設定/プロフィール: 情報色をアクセントに、淡い青背景
  profile: {
    accent: colors.info,
    tintSoft: colors.primary === "#2563EB" ? "#EFF6FF" : "#1F2937", // ライト: blue-50, ダーク: gray-800
    cardBg: colors.backgroundSecondary,
  },
});

// 後方互換性のため（colors は動的に更新される）
import { colors } from "./colors";
export const screenThemes = createScreenThemes(colors);
