import { ChallengeService } from "./firestore";
import { StatsService } from "./statsService";
// Firestore依存を廃止。必要ならSupabaseへの保存を別途検討

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
    // キャッシュをチェック
    const cached = this.userStatsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.averageDays;
    }

    try {
      // ユーザーのチャレンジ履歴を取得
      const challengesFs = await ChallengeService.getUserChallenges(userId);

      // Firestore型 -> ドメイン型へ正規化
      const challenges = challengesFs.map((c: any) => ({
        id: c.id,
        userId: c.userId,
        goalDays: c.goalDays,
        penaltyAmount: c.penaltyAmount,
        status: c.status,
        startedAt: toDateSafe(c.startedAt) ?? new Date(),
        completedAt: toDateSafe(c.completedAt),
        failedAt: toDateSafe(c.failedAt),
        totalPenaltyPaid: c.totalPenaltyPaid ?? 0,
        createdAt: toDateSafe(c.createdAt) ?? new Date(),
        updatedAt: toDateSafe(c.updatedAt) ?? new Date(),
      }));

      // 平均時間（秒）を計算
      const averageTime = StatsService.calculateAverageTime(challenges);
      // 秒→日
      const averageDays = averageTime / (24 * 60 * 60);

      // キャッシュに保存
      this.userStatsCache.set(userId, {
        averageDays,
        timestamp: Date.now(),
      });

      return averageDays;
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
      // 事前計算の読み込みは未実装（Supabase側での保存が必要なら実装）

      // フォールバック: チャレンジから計算（秒）
      const challengesFs = await ChallengeService.getUserChallenges(userId);
      const challenges = challengesFs.map((c: any) => ({
        id: c.id,
        userId: c.userId,
        goalDays: c.goalDays,
        penaltyAmount: c.penaltyAmount,
        status: c.status,
        startedAt: toDateSafe(c.startedAt) ?? new Date(),
        completedAt: toDateSafe(c.completedAt),
        failedAt: toDateSafe(c.failedAt),
        totalPenaltyPaid: c.totalPenaltyPaid ?? 0,
        createdAt: toDateSafe(c.createdAt) ?? new Date(),
        updatedAt: toDateSafe(c.updatedAt) ?? new Date(),
      }));
      const averageTime = StatsService.calculateAverageTime(challenges);
      const averageDays = averageTime / (24 * 60 * 60);

      this.rankCache.set(userId, {
        averageDays,
        timestamp: baseTime.getTime(),
      });

      // 保存は未実装（必要に応じてSupabase RPC等で保存）

      return averageDays;
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
