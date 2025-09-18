import type { TextStyle } from "react-native";

/**
 * 投稿内容の位置調整用の定数
 * アバター + マージンの合計値
 */
export const CONTENT_LEFT_MARGIN = {
  small: 48, // アバター40px + マージン8px
  medium: 68, // アバター60px + マージン8px
  large: 108, // アバター100px + マージン8px
} as const;

/**
 * ユーザー名の表示用スタイルを生成する共通関数
 * 長い名前でも適切に折り返し、レイアウトが崩れないようにする
 */
export const getUserNameStyle = (baseStyle?: TextStyle): TextStyle => {
  return {
    fontWeight: "600",
    color: "#1a1a1a",
    marginRight: 8,
    flexShrink: 1,
    flexWrap: "wrap",
    ...baseStyle,
  };
};

/**
 * ユーザー名の表示用コンテナスタイルを生成する共通関数
 * 名前とランクバッジを適切に配置する
 */
export const getUserNameContainerStyle = (): TextStyle => {
  return {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    flex: 1,
  };
};

/**
 * ユーザー名の表示用ヘッダーコンテナスタイル
 * アバターと名前、タイムスタンプを適切に配置
 */
// 以前のヘッダーコンテナスタイルは uiStyles.row へ集約しました（未使用のため削除）

/**
 * 肩書表示用のスタイル
 * 名前の下に表示されるランクや肩書用
 */
export const getTitleStyle = (
  size: "small" | "medium" | "large" = "medium",
): TextStyle => {
  const fontSizeMap = {
    small: 10,
    medium: 12,
    large: 14,
  };

  return {
    fontSize: fontSizeMap[size],
    fontWeight: "500",
    color: "#9E9E9E", // 肩書きの文字色は訓練兵に統一
    marginTop: 4,
    lineHeight: 16,
  };
};

/**
 * 投稿内容の位置調整用スタイル
 * 名前と同じ開始位置に合わせる
 */
export const getContentStyle = (
  size: "small" | "medium" | "large" = "medium",
): TextStyle => {
  const fontSizeMap = {
    small: 14,
    medium: 16,
    large: 18,
  };

  return {
    fontSize: fontSizeMap[size],
    color: "#1a1a1a",
    lineHeight: 20,
  };
};

/**
 * ブロック開始位置（コンテナ左パディングを考慮）
 * 各コンテンツブロックのmarginLeftに適用して、名前と同じ開始位置に揃える
 */
export const getBlockLeftMargin = (
  size: "small" | "medium" | "large" = "medium",
): number => {
  const map = {
    // コンテナ内（padding内）で使うため、そのまま「アバター+余白」の値を返す
    small: CONTENT_LEFT_MARGIN.small,
    medium: CONTENT_LEFT_MARGIN.medium,
    large: CONTENT_LEFT_MARGIN.large,
  } as const;
  return map[size];
};
