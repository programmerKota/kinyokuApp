import { db, COLLECTIONS } from "../config/firebase.config";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { FirestoreUserService } from "./firestore";
import { StatsService } from "./statsService";

export interface UserRanking {
  id: string;
  name: string;
  avatar?: string;
  averageTime: number; // 秒単位
  totalChallenges: number;
  completedChallenges: number;
  successRate: number;
  rank: number;
}

export class RankingService {
  /**
   * 全ユーザーの平均時間ランキングを取得
   */
  static async getUserRankings(): Promise<UserRanking[]> {
    try {
      // まず全チャレンジを取得し、ユーザーごとにグルーピング
      const challengesSnap = await getDocs(
        collection(db, COLLECTIONS.CHALLENGES)
      );
      if (challengesSnap.empty) return [];

      const byUser = new Map<string, any[]>();
      challengesSnap.docs.forEach((d) => {
        const data: any = d.data();
        const userId: string | undefined = data.userId;
        if (!userId) return;
        const normalized = {
          id: d.id,
          ...data,
          startedAt: data.startedAt?.toDate?.() || new Date(data.startedAt),
          completedAt: data.completedAt?.toDate?.() || null,
          failedAt: data.failedAt?.toDate?.() || null,
        };
        const arr = byUser.get(userId) || [];
        arr.push(normalized);
        byUser.set(userId, arr);
      });

      const rankings: UserRanking[] = [];

      for (const [userId, userChallenges] of byUser.entries()) {
        // StatsServiceと同じ計算方法（進行中も含む）。単位は秒
        const averageTime = StatsService.calculateAverageTime(userChallenges);
        if (averageTime === 0) continue;

        const userInfo = await FirestoreUserService.getUserById(userId);
        const completedCount = userChallenges.filter(
          (c: any) => c.status === "completed" || c.status === "failed"
        ).length;
        const successRate =
          (userChallenges.filter((c: any) => c.status === "completed").length /
            userChallenges.length) *
          100;

        rankings.push({
          id: userId,
          name: userInfo?.displayName || "ユーザー",
          avatar: userInfo?.photoURL,
          averageTime,
          totalChallenges: userChallenges.length,
          completedChallenges: completedCount,
          successRate: Math.round(successRate * 100) / 100,
          rank: 0,
        });
      }

      // 平均時間で降順ソート（長い時間が上位）
      rankings.sort((a, b) => b.averageTime - a.averageTime);
      rankings.forEach((r, i) => (r.rank = i + 1));
      return rankings;
    } catch (error) {
      console.error("ランキング取得エラー:", error);
      return [];
    }
  }

  /**
   * 特定ユーザーのチャレンジ履歴を取得
   */
  private static async getUserChallenges(userId: string) {
    try {
      const challengesSnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CHALLENGES),
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        )
      );

      return challengesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startedAt: data.startedAt?.toDate?.() || new Date(data.startedAt),
          completedAt: data.completedAt?.toDate?.() || null,
          failedAt: data.failedAt?.toDate?.() || null,
        };
      });
    } catch (error) {
      console.error("ユーザーチャレンジ取得エラー:", error);
      return [];
    }
  }
}
