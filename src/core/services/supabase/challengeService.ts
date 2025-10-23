type Unsubscribe = () => void;
import { supabase, supabaseConfig } from "@app/config/supabase.config";
import { Logger } from "@shared/utils/logger";

import type { FirestoreChallenge } from "../firestore/types";

type SupaChallengeRow = {
  id: string;
  userId: string;
  goalDays: number;
  penaltyAmount: number;
  status: "active" | "completed" | "failed" | "paused";
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  totalPenaltyPaid: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export class ChallengeService {
  private static toFirestore(row: SupaChallengeRow): FirestoreChallenge {
    return {
      id: row.id,
      userId: row.userId,
      goalDays: row.goalDays,
      penaltyAmount: row.penaltyAmount,
      status: row.status,
      startedAt: row.startedAt ? new Date(row.startedAt) : new Date(),
      completedAt: row.completedAt ? new Date(row.completedAt) : null,
      failedAt: row.failedAt ? new Date(row.failedAt) : null,
      totalPenaltyPaid: row.totalPenaltyPaid ?? 0,
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
    };
  }
  static async createChallenge(
    challengeData: Omit<FirestoreChallenge, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    if (!supabaseConfig?.isConfigured)
      throw new Error("Supabase未設定です。環境変数を設定してください。");
    // conflict check: active exists?
    const { data: s } = await supabase.auth.getSession();
    const uid = (s?.session?.user?.id as string | undefined) || challengeData.userId;
    const { data: active } = await supabase
      .from("challenges")
      .select("id")
      .eq("userId", uid)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (active) {
      throw new Error(
        "既に進行中のチャレンジがあります。停止してから開始してください。",
      );
    }

    const now = new Date().toISOString();
    const payload: any = {
      ...challengeData,
      userId: uid,
      startedAt:
        challengeData.startedAt instanceof Date
          ? challengeData.startedAt.toISOString()
          : (challengeData.startedAt as any),
      completedAt:
        challengeData.completedAt instanceof Date
          ? challengeData.completedAt.toISOString()
          : (challengeData.completedAt as any),
      failedAt:
        challengeData.failedAt instanceof Date
          ? challengeData.failedAt.toISOString()
          : (challengeData.failedAt as any),
      createdAt: now,
      updatedAt: now,
    };
    const { data, error } = await supabase
      .from("challenges")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return (data as any).id as string;
  }

  static async getUserChallenges(
    userId: string,
  ): Promise<FirestoreChallenge[]> {
    if (!supabaseConfig?.isConfigured) return [];
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .eq("userId", ((await supabase.auth.getSession()).data?.session?.user?.id as string | undefined) || userId)
      .order("createdAt", { ascending: false });
    if (error) throw error;
    const rows = (data || []) as unknown as SupaChallengeRow[];
    return rows.map(ChallengeService.toFirestore);
  }

  static async updateChallenge(
    challengeId: string,
    challengeData: Partial<Omit<FirestoreChallenge, "id" | "createdAt">>,
  ): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const payload: any = {
      ...challengeData,
      updatedAt: new Date().toISOString(),
    };
    if (challengeData.completedAt instanceof Date) {
      payload.completedAt = challengeData.completedAt.toISOString();
    }
    if (challengeData.failedAt instanceof Date) {
      payload.failedAt = challengeData.failedAt.toISOString();
    }
    const { error } = await supabase
      .from("challenges")
      .update(payload)
      .eq("id", challengeId);
    if (error) throw error;
  }

  static async safeStart(
    userId: string,
    data: Omit<FirestoreChallenge, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    if (!supabaseConfig?.isConfigured)
      throw new Error("Supabase未設定です。環境変数を設定してください。");
    const { data: s2 } = await supabase.auth.getSession();
    const uid2 = (s2?.session?.user?.id as string | undefined) || userId;
    const { data: active } = await supabase
      .from("challenges")
      .select("id")
      .eq("userId", uid2)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (active) {
      throw new Error(
        "既に進行中のチャレンジがあります。停止してから開始してください。",
      );
    }
    return await this.createChallenge(data);
  }

  static async getActiveChallenge(
    userId: string,
  ): Promise<FirestoreChallenge | null> {
    if (!supabaseConfig?.isConfigured) return null;
    const { data: s3 } = await supabase.auth.getSession();
    const uid3 = (s3?.session?.user?.id as string | undefined) || userId;
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .eq("userId", uid3)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return ChallengeService.toFirestore(data as unknown as SupaChallengeRow);
  }

  static subscribeToActiveChallenge(
    userId: string,
    callback: (challenge: FirestoreChallenge | null) => void,
  ): Unsubscribe {
    if (!supabaseConfig?.isConfigured) {
      callback(null);
      return () => {};
    }

    let channel: ReturnType<typeof supabase.channel> | undefined;

    const init = async () => {
      try {
        const ch = await ChallengeService.getActiveChallenge(userId);
        callback(ch);
      } catch (e) {
        Logger.warn("ChallengeService.init", e, { userId });
        callback(null);
      }

      channel = supabase
        .channel(`realtime:challenges:active:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "challenges", filter: `userId=eq.${userId}` },
          async () => {
            try { const ch = await ChallengeService.getActiveChallenge(userId); callback(ch); }
            catch (e) { Logger.warn("ChallengeService.subscription", e, { userId }); callback(null); }
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "challenges", filter: `userId=eq.${userId}` },
          async () => {
            try { const ch = await ChallengeService.getActiveChallenge(userId); callback(ch); }
            catch (e) { Logger.warn("ChallengeService.subscription", e, { userId }); callback(null); }
          },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "challenges", filter: `userId=eq.${userId}` },
          async () => {
            try { const ch = await ChallengeService.getActiveChallenge(userId); callback(ch); }
            catch (e) { Logger.warn("ChallengeService.subscription", e, { userId }); callback(null); }
          },
        )
        .subscribe();
    };

    void init();
    return () => {
      if (channel) channel.unsubscribe();
    };
  }
}

export default ChallengeService;
