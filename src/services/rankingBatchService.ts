import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../config/firebase.config";
import { COLLECTIONS } from "../config/firebase.config";
import { RankingService, UserRanking } from "./rankingService";

/**
 * ランキングバッチ処理サービス
 * 午後0時と午前0時にランキングを更新する
 */
export class RankingBatchService {
  private static readonly RANKING_CACHE_KEY = "cached_rankings";
  private static readonly LAST_UPDATE_KEY = "last_ranking_update";

  /**
   * ランキングを更新してキャッシュに保存
   */
  static async updateRankings(): Promise<void> {
    try {
      console.log("ランキングバッチ処理開始");

      // 最新のランキングデータを取得
      const rankings = await RankingService.getUserRankings();

      // ランキングデータをキャッシュに保存
      await this.cacheRankings(rankings);

      // 更新時刻を記録
      await this.updateLastUpdateTime();

      console.log(
        `ランキングバッチ処理完了: ${rankings.length}件のランキングを更新`
      );
    } catch (error) {
      console.error("ランキングバッチ処理エラー:", error);
      throw error;
    }
  }

  /**
   * キャッシュされたランキングを取得
   */
  static async getCachedRankings(): Promise<UserRanking[]> {
    try {
      const rankingsDoc = await getDocs(collection(db, COLLECTIONS.RANKINGS));

      if (rankingsDoc.empty) {
        return [];
      }

      const rankings: UserRanking[] = [];
      rankingsDoc.forEach((doc) => {
        const data = doc.data();
        rankings.push({
          id: doc.id,
          name: data.name,
          avatar: data.avatar,
          averageTime: data.averageTime,
          totalChallenges: data.totalChallenges,
          completedChallenges: data.completedChallenges,
          successRate: data.successRate,
          rank: data.rank,
        });
      });

      // ランク順でソート
      return rankings.sort((a, b) => a.rank - b.rank);
    } catch (error) {
      console.error("キャッシュされたランキング取得エラー:", error);
      return [];
    }
  }

  /**
   * ランキングデータをキャッシュに保存
   */
  private static async cacheRankings(rankings: UserRanking[]): Promise<void> {
    try {
      // 既存のキャッシュをクリア
      const existingCache = await getDocs(collection(db, COLLECTIONS.RANKINGS));
      const ops: Promise<void>[] = [];

      existingCache.forEach((docSnap) => {
        ops.push(deleteDoc(docSnap.ref));
      });

      // 新しいランキングデータを保存
      rankings.forEach((ranking) => {
        ops.push(
          setDoc(doc(db, COLLECTIONS.RANKINGS, ranking.id), {
            name: ranking.name,
            avatar: ranking.avatar,
            averageTime: ranking.averageTime,
            totalChallenges: ranking.totalChallenges,
            completedChallenges: ranking.completedChallenges,
            successRate: ranking.successRate,
            rank: ranking.rank,
            updatedAt: new Date(),
          })
        );
      });

      // 非トランザクションの並列実行
      await Promise.all(ops);
    } catch (error) {
      console.error("ランキングキャッシュ保存エラー:", error);
      throw error;
    }
  }

  /**
   * 最終更新時刻を記録
   */
  private static async updateLastUpdateTime(): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.SYSTEM, "ranking_update"), {
        lastUpdate: new Date(),
      });
    } catch (error) {
      console.error("最終更新時刻記録エラー:", error);
    }
  }

  /**
   * 最終更新時刻を取得
   */
  static async getLastUpdateTime(): Promise<Date | null> {
    try {
      const docRef = doc(db, COLLECTIONS.SYSTEM, "ranking_update");
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      const data: any = snap.data();
      const value = data.lastUpdate;
      // Firestore Timestamp もしくは Date を許容
      if (value?.toDate) return value.toDate();
      if (value instanceof Date) return value;
      return null;
    } catch (error) {
      console.error("最終更新時刻取得エラー:", error);
      return null;
    }
  }

  /**
   * 次回更新時刻を計算
   */
  static getNextUpdateTime(): Date {
    const now = new Date();
    const currentHour = now.getHours();

    // 午前0時または午後0時（12時）に更新
    let nextUpdate: Date;

    if (currentHour < 12) {
      // 午前中の場合、次の午後0時（12時）
      nextUpdate = new Date(now);
      nextUpdate.setHours(12, 0, 0, 0);
    } else {
      // 午後の場合、次の午前0時
      nextUpdate = new Date(now);
      nextUpdate.setDate(now.getDate() + 1);
      nextUpdate.setHours(0, 0, 0, 0);
    }

    return nextUpdate;
  }

  /**
   * ランキング更新が必要かチェック
   */
  static async shouldUpdateRankings(): Promise<boolean> {
    try {
      const lastUpdate = await this.getLastUpdateTime();

      if (!lastUpdate) {
        return true; // 初回実行
      }

      const now = new Date();
      const hoursSinceLastUpdate =
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

      // 12時間以上経過している場合は更新が必要
      return hoursSinceLastUpdate >= 12;
    } catch (error) {
      console.error("ランキング更新チェックエラー:", error);
      return true; // エラーの場合は更新を実行
    }
  }
}
