import { supabase, supabaseConfig } from "@app/config/supabase.config";

import type { FirestoreDiary } from "../firestore/types";

export class DiaryService {
  static async getUserDiaries(userId: string): Promise<FirestoreDiary[]> {
    if (!supabaseConfig?.isConfigured) return [];
    const { data: s } = await supabase.auth.getSession();
    const uid = (s?.session?.user?.id as string | undefined) || userId;
    const { data, error } = await supabase
      .from("diaries")
      .select("*")
      .eq("userId", uid)
      .order("createdAt", { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as FirestoreDiary[];
  }

  static async addDiary(userId: string, content: string): Promise<string> {
    if (!supabaseConfig?.isConfigured) return "dev-placeholder-id";
    const { data: s } = await supabase.auth.getSession();
    const uid = (s?.session?.user?.id as string | undefined) || userId;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("diaries")
      .insert({ userId: uid, content, createdAt: now, updatedAt: now })
      .select("id")
      .single<{ id: string }>();
    if (error) throw error;
    return String(data.id);
  }

  static async addDiaryForActiveChallenge(
    userId: string,
    content: string,
    options?: { day?: number },
  ): Promise<string> {
    if (!supabaseConfig?.isConfigured) return "dev-placeholder-id";
    const { data: s } = await supabase.auth.getSession();
    const uid = (s?.session?.user?.id as string | undefined) || userId;
    // 既存のChallengeServiceを利用（移行中のため）
    const ChallengeService = (await import("../firestore/challengeService"))
      .ChallengeService;
    const active = await ChallengeService.getActiveChallenge(uid).catch(
      () => null,
    );
    if (!active) {
      throw new Error(
        "アクティブなチャレンジがありません。開始後に日記を追加できます。",
      );
    }

    const startedAt: Date = active.startedAt;
    const now = new Date();
    const computedDay =
      Math.floor((now.getTime() - startedAt.getTime()) / (24 * 3600 * 1000)) +
      1;
    const day: number =
      options?.day && options.day > 0 ? options.day : computedDay;

    if (day !== computedDay) {
      throw new Error(
        `現在のチャレンジ日数（${computedDay}日目）にのみ投稿できます。`,
      );
    }

    // 重複チェック（1日1件）
    const { data: dup, error: dupErr } = await supabase
      .from("diaries")
      .select("id")
      .eq("userId", uid)
      .eq("challengeId", active.id)
      .eq("day", day)
      .limit(1)
      .maybeSingle();
    if (!dupErr && dup) {
      throw new Error("この日は既に投稿済みです。");
    }

    const iso = now.toISOString();
    const { data, error } = await supabase
      .from("diaries")
      .insert({
        userId: uid,
        content,
        challengeId: active?.id ?? null,
        day,
        createdAt: iso,
        updatedAt: iso,
      })
      .select("id")
      .single<{ id: string }>();
    if (error) throw error;
    return String(data.id);
  }

  static async getDiariesByDay(
    day: number,
    max: number = 100,
  ): Promise<FirestoreDiary[]> {
    if (!supabaseConfig?.isConfigured) return [];
    const { data, error } = await supabase
      .from("diaries_v")
      .select("id,userId,content,createdAt,authorName,authorAvatar")
      .eq("day", day)
      .order("createdAt", { ascending: false })
      .limit(max);
    if (error) throw error;
    return (data || []) as unknown as FirestoreDiary[];
  }

  static async deleteDiary(id: string): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const { error } = await supabase.from("diaries").delete().eq("id", id);
    if (error) throw error;
  }

  static async hasDiaryForActiveChallengeDay(
    userId: string,
    day: number,
  ): Promise<boolean> {
    if (!supabaseConfig?.isConfigured) return false;
    const { data: s } = await supabase.auth.getSession();
    const uid = (s?.session?.user?.id as string | undefined) || userId;
    const ChallengeService = (await import("../firestore/challengeService"))
      .ChallengeService;
    const active = await ChallengeService.getActiveChallenge(uid).catch(
      () => null,
    );
    if (!active) return false;
    const { data, error } = await supabase
      .from("diaries")
      .select("id")
      .eq("userId", uid)
      .eq("challengeId", active.id)
      .eq("day", day)
      .limit(1)
      .maybeSingle();
    if (error) return false;
    return !!data;
  }
}

export default DiaryService;
