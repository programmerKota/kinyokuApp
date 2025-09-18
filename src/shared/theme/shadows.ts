// アプリケーション全体で使用するシャドウの定義
export const shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
  },

  base: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },

  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    boxShadow: "0 2px 3.84px rgba(0, 0, 0, 0.1)",
  },

  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6.27,
    elevation: 8,
    boxShadow: "0 4px 6.27px rgba(0, 0, 0, 0.15)",
  },

  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8.3,
    elevation: 12,
    // Web用のboxShadow
    boxShadow: "0 6px 8.3px rgba(0, 0, 0, 0.2)",
  },

  "2xl": {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 10.32,
    elevation: 16,
    boxShadow: "0 8px 10.32px rgba(0, 0, 0, 0.25)",
  },

  // 特殊なシャドウ
  inner: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 0,
    boxShadow: "inset 0 2px 3px rgba(0, 0, 0, 0.06)",
  },

  focus: {
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 0,
    boxShadow: "0 0 4px rgba(99, 102, 241, 0.25)",
  },
} as const;

export type ShadowKey = keyof typeof shadows;
