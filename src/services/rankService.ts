export interface RankInfo {
  title: string;
  minDays: number;
  maxDays?: number;
  color: string;
  emoji: string;
}

export const RANK_TITLES: RankInfo[] = [
  { minDays: 0, maxDays: 0, title: '訓練兵', emoji: '🔰', color: '#9E9E9E' },
  { minDays: 1, maxDays: 1, title: '二等兵', emoji: '🔰⭐', color: '#795548' },
  {
    minDays: 2,
    maxDays: 2,
    title: '一等兵',
    emoji: '🔰⭐⭐',
    color: '#607D8B',
  },
  {
    minDays: 3,
    maxDays: 6,
    title: '上等兵',
    emoji: '🔰⭐⭐⭐',
    color: '#4CAF50',
  },
  { minDays: 7, maxDays: 13, title: '兵長', emoji: '🪙', color: '#2196F3' },
  { minDays: 14, maxDays: 20, title: '伍長', emoji: '🛡️⭐', color: '#9C27B0' },
  {
    minDays: 21,
    maxDays: 29,
    title: '軍曹',
    emoji: '🛡️⭐⭐',
    color: '#FF9800',
  },
  {
    minDays: 30,
    maxDays: 39,
    title: '軍長',
    emoji: '🛡️⭐⭐⭐',
    color: '#F44336',
  },
  { minDays: 40, maxDays: 49, title: '准尉', emoji: '🎗️', color: '#E91E63' },
  { minDays: 50, maxDays: 59, title: '少尉', emoji: '🎖️⭐', color: '#3F51B5' },
  {
    minDays: 60,
    maxDays: 69,
    title: '中尉',
    emoji: '🎖️⭐⭐',
    color: '#009688',
  },
  {
    minDays: 70,
    maxDays: 99,
    title: '大尉',
    emoji: '🎖️⭐⭐⭐',
    color: '#8BC34A',
  },
  {
    minDays: 100,
    maxDays: 149,
    title: '少佐',
    emoji: '🏆⭐',
    color: '#FFC107',
  },
  {
    minDays: 150,
    maxDays: 199,
    title: '中佐',
    emoji: '🏆⭐⭐',
    color: '#FF5722',
  },
  {
    minDays: 200,
    maxDays: 299,
    title: '大佐',
    emoji: '🏆⭐⭐⭐',
    color: '#673AB7',
  },
  {
    minDays: 300,
    maxDays: 399,
    title: '小将',
    emoji: '🏵️⭐',
    color: '#E91E63',
  },
  {
    minDays: 400,
    maxDays: 499,
    title: '中将',
    emoji: '🏵️⭐⭐',
    color: '#3F51B5',
  },
  {
    minDays: 500,
    maxDays: 999,
    title: '大将',
    emoji: '🏵️⭐⭐⭐',
    color: '#FF9800',
  },
  { minDays: 1000, title: 'ナポレオン', emoji: '👑', color: '#F44336' },
];

export const getRankByDays = (averageDays: number): RankInfo => {
  // 平均日数を整数に変換
  const days = Math.floor(averageDays);

  // 該当する肩書を検索
  for (const rank of RANK_TITLES) {
    if (rank.maxDays === undefined) {
      // 上限なし（ナポレオン）
      if (days >= rank.minDays) {
        return rank;
      }
    } else {
      // 上限あり
      if (days >= rank.minDays && days <= rank.maxDays) {
        return rank;
      }
    }
  }

  // デフォルトは訓練兵
  return RANK_TITLES[0];
};

export const getRankDisplayByDays = (averageDays: number): string => {
  const rank = getRankByDays(averageDays);
  // 表示形式: タイトル（絵文字）
  return `${rank.title}（${rank.emoji}）`;
};

export const getNextRank = (currentRank: RankInfo): RankInfo | null => {
  const currentIndex = RANK_TITLES.findIndex((rank) => rank.title === currentRank.title);
  if (currentIndex === -1 || currentIndex === RANK_TITLES.length - 1) {
    return null; // 最後の肩書または見つからない場合
  }
  return RANK_TITLES[currentIndex + 1];
};

export const getDaysToNextRank = (currentDays: number, currentRank: RankInfo): number => {
  const nextRank = getNextRank(currentRank);
  if (!nextRank) {
    return 0; // 次の肩書がない場合
  }
  return nextRank.minDays - currentDays;
};
