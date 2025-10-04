import { supabase } from "@app/config/supabase.config";
import { toDate } from "@shared/utils/date";
// import type { Challenge } from "@project-types";

import { FirestoreUserService } from "./firestore";
// import { StatsService } from "./statsService";

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
      // 現在挑戦中（active）の継続時間でランキング（Supabase）
      const { data, error } = await supabase
        .from("challenges")
        .select("userId, startedAt, status")
        .eq("status", "active");
      if (error) throw error;
      type Row = { userId: string; startedAt: string; status: string };
      const rows = (data || []) as Row[];
      if (rows.length === 0) return [];

      const now = Date.now();
      // Map: userId -> latest active challenge start time
      const latestActiveByUser = new Map<string, Date | undefined>();

      rows.forEach((r) => {
        const userId = r.userId as string | undefined;
        const status = r.status as string | undefined;
        if (!userId || status !== "active") return;
        const startedAt = toDate(r.startedAt);
        // 1ユーザーに1件想定。念のため最新 startedAt を採用。
        const prev = latestActiveByUser.get(userId);
        if (!prev || (prev?.getTime?.() || 0) < (startedAt?.getTime?.() || 0)) {
          latestActiveByUser.set(userId, startedAt);
        }
      });

      const rankings: UserRanking[] = [];

      // Avoid N network calls: profileはUI側のuseProfile(ProfileCache)で解決する
      for (const [userId, active] of latestActiveByUser.entries()) {
        const start = active?.getTime?.() || 0;
        if (!start) continue;
        const duration = Math.max(0, Math.floor((now - start) / 1000)); // 秒

        rankings.push({
          id: userId,
          name: "ユーザー",
          avatar: undefined,
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
      console.error("RankingService.getUserRankings error:", error);
      return [];
    }
  }

  /**
   * 指定ユーザーのチャレンジ一覧を取得
   */
  private static async getUserChallenges(userId: string) {
    try {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("userId", userId)
        .order("createdAt", { ascending: false });
      if (error) throw error;
      type CRow = {
        id: string;
        userId: string;
        goalDays: number;
        penaltyAmount: number;
        status: string;
        startedAt: string;
        completedAt?: string | null;
        failedAt?: string | null;
        totalPenaltyPaid?: number;
        createdAt: string;
        updatedAt: string;
      };
      return ((data || []) as CRow[]).map((row) => ({
        id: row.id,
        ...row,
        startedAt: toDate(row.startedAt),
        completedAt: row.completedAt ? toDate(row.completedAt) : null,
        failedAt: row.failedAt ? toDate(row.failedAt) : null,
      }));
    } catch (error) {
      console.error("RankingService.getUserChallenges error:", error);
      return [];
    }
  }
}
