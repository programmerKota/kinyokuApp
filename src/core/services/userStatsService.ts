import { ChallengeService } from "./firestore";
// 仕様更新: ランキング/肩書きは履歴の平均ではなく「現在のチャレンジの記録」から算出する

function toDateSafe(v: any): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === "function") return v.toDate();
  return undefined;
}

export class UserStatsService {
  private static userStatsCache = new Map<
    string,
    { averageDays: number; timestamp: number }
  >();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュ

  // 肩書用のキャッシュ（1日1回更新、午前5時）
  private static rankCache = new Map<
    string,
    { averageDays: number; timestamp: number }
  >();

  static async getUserAverageDays(userId: string): Promise<number> {
    // 新仕様: 過去の平均ではなく「現在のアクティブなチャレンジ」から算出
    const cached = this.userStatsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.averageDays;
    }
    try {
      const active = await ChallengeService.getActiveChallenge(userId);
      if (!active?.startedAt) {
        this.userStatsCache.set(userId, { averageDays: 0, timestamp: Date.now() });
        return 0;
      }
      const start = toDateSafe((active as any).startedAt) ?? new Date();
      const now = new Date();
      const days = Math.max(0, (now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      this.userStatsCache.set(userId, { averageDays: days, timestamp: Date.now() });
      return days;
    } catch (error) {
      console.error("ユーザーの平均日数取得に失敗:", error);
      return 0;
    }
  }

  // 肩書用の平均日数取得（1日1回更新、午前5時）
  static async getUserAverageDaysForRank(userId: string): Promise<number> {
    const now = new Date();
    const today5AM = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      5,
      0,
      0,
      0,
    );

    // 現在時刻が午前5時より前の場合は、前日の午前5時を基準にする
    const baseTime =
      now < today5AM
        ? new Date(today5AM.getTime() - 24 * 60 * 60 * 1000)
        : today5AM;

    const cached = this.rankCache.get(userId);
    if (cached && cached.timestamp >= baseTime.getTime()) {
      return cached.averageDays;
    }

    try {
      // 新仕様: 現在のアクティブなチャレンジのみから算出
      const active = await ChallengeService.getActiveChallenge(userId);
      if (!active?.startedAt) {
        this.rankCache.set(userId, { averageDays: 0, timestamp: baseTime.getTime() });
        return 0;
      }
      const start = toDateSafe((active as any).startedAt) ?? new Date();
      const now = new Date();
      const days = Math.max(0, (now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));

      this.rankCache.set(userId, { averageDays: days, timestamp: baseTime.getTime() });
      return days;
    } catch (error) {
      console.error("ユーザーの平均日数取得に失敗:", error);
      return 0;
    }
  }

  // 現在のチャレンジの「経過日（0日=開始当日）」で階級を算出
  // 開始から24時間未満は0日（訓練兵）として扱う
  static async getUserCurrentDaysForRank(userId: string): Promise<number> {
    try {
      const active = await ChallengeService.getActiveChallenge(userId);
      if (!active) return 0;
      const started = toDateSafe((active as any).startedAt) ?? new Date();
      const now = new Date();
      // 0-based 経過日数（開始直後は0日）
      const days = Math.floor(
        (now.getTime() - started.getTime()) / (24 * 60 * 60 * 1000),
      );
      return Math.max(0, days);
    } catch (e) {
      console.error("現在のチャレンジ日数取得に失敗:", e);
      return 0;
    }
  }

  static clearCache(): void {
    this.userStatsCache.clear();
    this.rankCache.clear();
  }
}
