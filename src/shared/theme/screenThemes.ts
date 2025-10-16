import { colors } from "./colors";

export type ScreenTheme = {
  accent: string;
  tintSoft: string;
  cardBg: string;
  badgeBg?: string;
  badgeText?: string;
};

export const screenThemes: {
  auth: ScreenTheme;
  history: ScreenTheme;
  profile: ScreenTheme;
} = {
  // 認証画面: 落ち着いたブルー基調 + ソフトな青系背景
  auth: {
    accent: "#1a73e8", // Google系ブルーに合わせたアクセント
    tintSoft: "#EFF6FF", // blue-50/100系の淡色
    cardBg: colors.white,
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
    tintSoft: "#EFF6FF",
    cardBg: colors.white,
  },
};
