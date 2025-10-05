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
   * ページング取得: 現在アクティブな挑戦を startedAt 昇順（古い=継続長い）で取得。
   * nextCursor は { startedAt, userId }。ページング時は startedAt が前ページ末尾より新しいものを取得します。
   */
  static async getUserRankingsPage(
    pageSize: number,
    after?: { startedAt?: string; userId?: string },
  ): Promise<{
    items: UserRanking[];
    nextCursor?: { startedAt: string; userId: string };
  }> {
    try {
      // 進行中の挑戦のみ対象
      let query = supabase
        .from("challenges")
        .select("userId, startedAt, status")
        .eq("status", "active")
        .order("startedAt", { ascending: true })
        .limit(pageSize);

      if (after?.startedAt) {
        // 前ページの末尾より新しい startedAt を続きとして取得
        query = query.gt("startedAt", after.startedAt);
      }

      const { data, error } = await query;
      if (error) throw error;
      type Row = { userId: string; startedAt: string; status: string };
      const rows = (data || []) as Row[];

      const now = Date.now();
      const items: UserRanking[] = rows
        .filter((r) => r.userId && r.startedAt)
        .map((r) => {
          const start = new Date(r.startedAt).getTime();
          const duration = Math.max(0, Math.floor((now - start) / 1000));
          return {
            id: r.userId,
            name: "ユーザー",
            avatar: undefined,
            averageTime: duration,
            totalChallenges: 1,
            completedChallenges: 0,
            successRate: 0,
            rank: 0, // 画面側で通し順位を付与
          } as UserRanking;
        });

      const nextCursor = rows.length
        ? {
            startedAt: rows[rows.length - 1].startedAt,
            userId: rows[rows.length - 1].userId,
          }
        : undefined;

      return { items, nextCursor };
    } catch (error) {
      console.error("RankingService.getUserRankingsPage error:", error);
      return { items: [], nextCursor: undefined };
    }
  }
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
