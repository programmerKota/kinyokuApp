export interface RankInfo {
  title: string;
  minDays: number;
  maxDays?: number;
  color: string;
  emoji: string;
}

// 階級一覧（1日目=1。0日は未開始）
export const RANK_TITLES: RankInfo[] = [
  { minDays: 0, maxDays: 0, title: "訓練兵", emoji: "🔰", color: "#9E9E9E" },
  { minDays: 1, maxDays: 1, title: "二等兵", emoji: "🔰⭐", color: "#795548" },
  { minDays: 2, maxDays: 2, title: "一等兵", emoji: "🔰⭐⭐", color: "#607D8B" },
  { minDays: 3, maxDays: 6, title: "上等兵", emoji: "🔰⭐⭐⭐", color: "#4CAF50" },
  { minDays: 7, maxDays: 13, title: "兵長", emoji: "🪖", color: "#2196F3" },
  { minDays: 14, maxDays: 20, title: "伍長", emoji: "🛡️", color: "#9C27B0" },
  { minDays: 21, maxDays: 29, title: "軍曹", emoji: "🛡️⭐", color: "#FF9800" },
  { minDays: 30, maxDays: 39, title: "軍長", emoji: "🛡️⭐⭐", color: "#F44336" },
  { minDays: 40, maxDays: 49, title: "准尉", emoji: "🎗️", color: "#E91E63" },
  { minDays: 50, maxDays: 59, title: "少尉", emoji: "🎖️", color: "#3F51B5" },
  { minDays: 60, maxDays: 69, title: "中尉", emoji: "🎖️⭐", color: "#009688" },
  { minDays: 70, maxDays: 99, title: "大尉", emoji: "🎖️⭐⭐", color: "#8BC34A" },
  { minDays: 100, maxDays: 149, title: "少佐", emoji: "🏆", color: "#FFC107" },
  { minDays: 150, maxDays: 199, title: "中佐", emoji: "🏆⭐", color: "#FF5722" },
  { minDays: 200, maxDays: 299, title: "大佐", emoji: "🏆⭐⭐", color: "#673AB7" },
  { minDays: 300, maxDays: 399, title: "少将", emoji: "🏵️", color: "#E91E63" },
  { minDays: 400, maxDays: 499, title: "中将", emoji: "🏵️⭐", color: "#3F51B5" },
  { minDays: 500, maxDays: 999, title: "大将", emoji: "🏵️⭐⭐", color: "#FF9800" },
  { minDays: 1000, title: "ナポレオン", emoji: "👑", color: "#F44336" },
];

export const getRankByDays = (averageDays: number): RankInfo => {
  const days = Math.floor(averageDays);
  for (const rank of RANK_TITLES) {
    if (rank.maxDays === undefined) {
      if (days >= rank.minDays) return rank;
    } else if (days >= rank.minDays && days <= rank.maxDays) {
      return rank;
    }
  }
  return RANK_TITLES[0];
};

export const getRankDisplayByDays = (averageDays: number): string => {
  const rank = getRankByDays(averageDays);
  return `${rank.title} ${rank.emoji}`;
};

