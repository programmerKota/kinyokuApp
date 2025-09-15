import { ChallengeService } from "./firestore";
import { StatsService } from "./statsService";
import { db, COLLECTIONS } from "../config/firebase.config";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { getRankByDays } from "./rankService";

const DISABLE_FIRESTORE = process.env.EXPO_PUBLIC_DISABLE_FIRESTORE === "true";

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
      const challenges = await ChallengeService.getUserChallenges(userId);

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
      0
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
      // users/{uid} に事前計算がある場合はそれを利用（rankUpdatedAt が基準時刻以降）
      try {
        const ref = doc(db, COLLECTIONS.USERS, userId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d: any = snap.data();
          const updatedAt: any =
            d.rankUpdatedAt ?? d.rankUpdatedAtTs ?? d.rank_updated_at;
          const updated = updatedAt?.toDate
            ? updatedAt.toDate()
            : updatedAt instanceof Date
            ? updatedAt
            : undefined;
          if (
            typeof d.rankAverageDays === "number" &&
            updated &&
            updated.getTime() >= baseTime.getTime()
          ) {
            const avgDays = d.rankAverageDays as number;
            this.rankCache.set(userId, {
              averageDays: avgDays,
              timestamp: baseTime.getTime(),
            });
            return avgDays;
          }
        }
      } catch {}

      // フォールバック: チャレンジから計算（秒）
      const challenges = await ChallengeService.getUserChallenges(userId);
      const averageTime = StatsService.calculateAverageTime(challenges);
      const averageDays = averageTime / (24 * 60 * 60);

      this.rankCache.set(userId, {
        averageDays,
        timestamp: baseTime.getTime(),
      });

      // ベストエフォートで users/{uid} に保存（開発用: Emulator / オンライン時）
      try {
        if (!DISABLE_FIRESTORE) {
          const ref = doc(db, COLLECTIONS.USERS, userId);
          const r = getRankByDays(averageDays);
          await setDoc(
            ref,
            {
              rankAverageDays: averageDays,
              rankTitle: r.title,
              rankEmoji: r.emoji,
              rankUpdatedAt: Timestamp.now(),
            } as any,
            { merge: true }
          );
        }
      } catch {}

      return averageDays;
    } catch (error) {
      console.error("ユーザーの平均日数取得に失敗:", error);
      return 0;
    }
  }

  static clearCache(): void {
    this.userStatsCache.clear();
    this.rankCache.clear();
  }
}
