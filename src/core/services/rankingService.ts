import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { toDate } from '@shared/utils/date';
import type { Challenge } from '@project-types';

import { FirestoreUserService } from './firestore';
import { StatsService } from './statsService';
import { db, COLLECTIONS } from '@app/config/firebase.config';

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
      // 現在挑戦中（active）の継続時間でランキング
      const challengesSnap = await getDocs(
        query(collection(db, COLLECTIONS.CHALLENGES), where('status', '==', 'active')),
      );
      if (challengesSnap.empty) return [];

      const now = Date.now();
      const latestActiveByUser = new Map<string, Challenge>();

      challengesSnap.docs.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        const userId = data.userId as string | undefined;
        const status = data.status as string | undefined;
        if (!userId || status !== 'active') return;
        const normalized = {
          id: d.id,
          ...data,
          startedAt: toDate((data as any).startedAt),
          completedAt: null,
          failedAt: null,
        } as Challenge;
        // 1ユーザーに1件想定。念のため最新 startedAt を採用。
        const prev = latestActiveByUser.get(userId);
        if (!prev || (prev.startedAt?.getTime?.() || 0) < (normalized.startedAt?.getTime?.() || 0)) {
          latestActiveByUser.set(userId, normalized);
        }
      });

      const rankings: UserRanking[] = [];

      for (const [userId, active] of latestActiveByUser.entries()) {
        const start = active.startedAt?.getTime?.() || 0;
        if (!start) continue;
        const duration = Math.max(0, Math.floor((now - start) / 1000)); // 秒

        const userInfo = await FirestoreUserService.getUserById(userId);

        rankings.push({
          id: userId,
          name: userInfo?.displayName || 'ユーザー',
          avatar: userInfo?.photoURL,
          averageTime: duration, // フィールド名は互換のためそのまま
          totalChallenges: 1,
          completedChallenges: 0,
          successRate: 0,
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
        } as Challenge;
      });
    } catch (error) {
      console.error('RankingService.getUserChallenges error:', error);
      return [];
    }
  }
}
