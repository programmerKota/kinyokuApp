type Unsubscribe = () => void;
import { supabase, supabaseConfig } from "@app/config/supabase.config";

import type { FirestoreChallenge } from "../firestore/types";

export class ChallengeService {
  static async createChallenge(
    challengeData: Omit<FirestoreChallenge, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    if (!supabaseConfig?.isConfigured)
      throw new Error("Supabase未設定です。環境変数を設定してください。");
    // conflict check: active exists?
    const { data: active } = await supabase
      .from("challenges")
      .select("id")
      .eq("userId", challengeData.userId)
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
      .eq("userId", userId)
      .order("createdAt", { ascending: false });
    if (error) throw error;
    return (data || []).map((d) => ({
      ...d,
      startedAt: d.startedAt ? new Date(d.startedAt) : undefined,
      completedAt: d.completedAt ? new Date(d.completedAt) : null,
      failedAt: d.failedAt ? new Date(d.failedAt) : null,
    })) as FirestoreChallenge[];
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
    const { data: active } = await supabase
      .from("challenges")
      .select("id")
      .eq("userId", userId)
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
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .eq("userId", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ...data,
      startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
      failedAt: data.failedAt ? new Date(data.failedAt) : null,
    } as FirestoreChallenge;
  }

  static subscribeToActiveChallenge(
    userId: string,
    callback: (challenge: FirestoreChallenge | null) => void,
  ): Unsubscribe {
    if (!supabaseConfig?.isConfigured) {
      callback(null);
      return () => {};
    }
    let cancelled = false;
    let timer: any;

    const tick = async () => {
      try {
        const ch = await ChallengeService.getActiveChallenge(userId);
        if (!cancelled) callback(ch);
      } catch (e) {
        if (!cancelled) callback(null);
      } finally {
        if (!cancelled) timer = setTimeout(tick, 5000);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }
}

export default ChallengeService;
