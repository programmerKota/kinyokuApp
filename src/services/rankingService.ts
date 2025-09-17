import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { toDate } from '../utils/date';
import type { Challenge } from '../types';

import { FirestoreUserService } from './firestore';
import { StatsService } from './statsService';
import { db, COLLECTIONS } from '../config/firebase.config';

export interface UserRanking {
  id: string;
  name: string;
  avatar?: string;
  averageTime: number; // 平均時間
  totalChallenges: number;
  completedChallenges: number;
  successRate: number;
  rank: number;
}

export class RankingService {
  /**
   * ユーザーのランキングを計算
   */
  static async getUserRankings(): Promise<UserRanking[]> {
    try {
      // 全チャレンジを取得
      const challengesSnap = await getDocs(collection(db, COLLECTIONS.CHALLENGES));
      if (challengesSnap.empty) return [];

      const byUser = new Map<string, Challenge[]>();
      challengesSnap.docs.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        const userId = data.userId as string | undefined;
        if (!userId) return;
        const normalized = {
          id: d.id,
          ...data,
          startedAt: toDate((data as any).startedAt),
          completedAt: (data as any).completedAt ? toDate((data as any).completedAt) : null,
          failedAt: (data as any).failedAt ? toDate((data as any).failedAt) : null,
        };
        const arr = byUser.get(userId) || [];
        arr.push(normalized);
        byUser.set(userId, arr);
      });

      const rankings: UserRanking[] = [];

      for (const [userId, userChallenges] of byUser.entries()) {
        const averageTime = StatsService.calculateAverageTime(userChallenges);
        if (averageTime === 0) continue;

        const userInfo = await FirestoreUserService.getUserById(userId);
        const completedCount = userChallenges.filter(
          (c: any) => c.status === 'completed' || c.status === 'failed',
        ).length;
        const successRate =
          (userChallenges.filter((c: any) => c.status === 'completed').length /
            userChallenges.length) *
          100;

        rankings.push({
          id: userId,
          name: userInfo?.displayName || 'ユーザー',
          avatar: userInfo?.photoURL,
          averageTime,
          totalChallenges: userChallenges.length,
          completedChallenges: completedCount,
          successRate: Math.round(successRate * 100) / 100,
          rank: 0,
        });
      }

      rankings.sort((a, b) => b.averageTime - a.averageTime);
      rankings.forEach((r, i) => (r.rank = i + 1));
      return rankings;
    } catch (error) {
      console.error('RankingService.getUserRankings error:', error);
      return [];
    }
  }

  /**
   * 指定ユーザーのチャレンジ一覧を取得
   */
  private static async getUserChallenges(userId: string) {
    try {
      const challengesSnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CHALLENGES),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
        ),
      );

      return challengesSnapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
          id: doc.id,
          ...data,
          startedAt: toDate((data as any).startedAt),
          completedAt: (data as any).completedAt ? toDate((data as any).completedAt) : null,
          failedAt: (data as any).failedAt ? toDate((data as any).failedAt) : null,
        };
      });
    } catch (error) {
      console.error('RankingService.getUserChallenges error:', error);
      return [];
    }
  }
}

