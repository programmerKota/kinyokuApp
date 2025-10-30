type Unsubscribe = () => void;
import type { FailureReflection } from "@project-types";
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
  reflectionNote: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export class ChallengeService {
  private static parseReflection(raw: string | null): FailureReflection | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as FailureReflection;
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  }

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
      reflectionNote: row.reflectionNote ?? null,
      reflection: ChallengeService.parseReflection(row.reflectionNote),
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
    const uid = s?.session?.user?.id || challengeData.userId;
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
    const payload = {
      ...challengeData,
      userId: uid,
      startedAt:
        challengeData.startedAt instanceof Date
          ? challengeData.startedAt.toISOString()
          : typeof challengeData.startedAt === "string"
            ? challengeData.startedAt
            : null,
      completedAt:
        challengeData.completedAt instanceof Date
          ? challengeData.completedAt.toISOString()
          : typeof challengeData.completedAt === "string"
            ? challengeData.completedAt
            : null,
      failedAt:
        challengeData.failedAt instanceof Date
          ? challengeData.failedAt.toISOString()
          : typeof challengeData.failedAt === "string"
            ? challengeData.failedAt
            : null,
      reflectionNote:
        typeof challengeData.reflectionNote === "string"
          ? challengeData.reflectionNote
          : null,
      createdAt: now,
      updatedAt: now,
    };
    const { data, error } = await supabase
      .from("challenges")
      .insert(payload)
      .select("id")
      .single<{ id: string }>();
    if (error) throw error;
    return String(data.id);
  }

  static async getUserChallenges(
    userId: string,
  ): Promise<FirestoreChallenge[]> {
    if (!supabaseConfig?.isConfigured) return [];
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .eq(
        "userId",
        (await supabase.auth.getSession()).data?.session?.user?.id || userId,
      )
      .order("createdAt", { ascending: false });
    if (error) throw error;
    const rows = (data || []) as unknown as SupaChallengeRow[];
    // static メソッド参照のアンバウンド警告を回避
    return rows.map((r) => ChallengeService.toFirestore(r));
  }

  static async updateChallenge(
    challengeId: string,
    challengeData: Partial<Omit<FirestoreChallenge, "id" | "createdAt">>,
  ): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const update: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    for (const [key, value] of Object.entries(challengeData)) {
      if (
        key === "completedAt" ||
        key === "failedAt" ||
        key === "reflectionNote"
      ) {
        continue;
      }
      if (key === "reflection") continue;
      update[key] = value;
    }
    if (challengeData.completedAt instanceof Date) {
      update.completedAt = challengeData.completedAt.toISOString();
    }
    if (challengeData.failedAt instanceof Date) {
      update.failedAt = challengeData.failedAt.toISOString();
    }
    if (Object.prototype.hasOwnProperty.call(challengeData, "reflectionNote")) {
      const raw = challengeData.reflectionNote;
      update.reflectionNote =
        typeof raw === "string" && raw.length > 0 ? raw : null;
    }
    const { error } = await supabase
      .from("challenges")
      .update(update)
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
    const uid2 = s2?.session?.user?.id || userId;
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
    const uid3 = s3?.session?.user?.id || userId;
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
          {
            event: "INSERT",
            schema: "public",
            table: "challenges",
            filter: `userId=eq.${userId}`,
          },
          async () => {
            try {
              const ch = await ChallengeService.getActiveChallenge(userId);
              callback(ch);
            } catch (e) {
              Logger.warn("ChallengeService.subscription", e, { userId });
              callback(null);
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "challenges",
            filter: `userId=eq.${userId}`,
          },
          async () => {
            try {
              const ch = await ChallengeService.getActiveChallenge(userId);
              callback(ch);
            } catch (e) {
              Logger.warn("ChallengeService.subscription", e, { userId });
              callback(null);
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "challenges",
            filter: `userId=eq.${userId}`,
          },
          async () => {
            try {
              const ch = await ChallengeService.getActiveChallenge(userId);
              callback(ch);
            } catch (e) {
              Logger.warn("ChallengeService.subscription", e, { userId });
              callback(null);
            }
          },
        )
        .subscribe();
    };

    void init();
    return () => {
      if (channel) {
        void channel.unsubscribe();
      }
    };
  }
}

export default ChallengeService;
