type Unsubscribe = () => void;
import { supabase, supabaseConfig } from "@app/config/supabase.config";
import type { StrictTournamentParticipant } from "@project-types/strict";

import { FirestoreUserService } from "./userService";
import { FirestoreError } from "../firestore/errors";
import type {
  FirestoreTournament,
  FirestoreTournamentJoinRequest,
  FirestoreTournamentMessage,
  FirestoreTournamentParticipant,
} from "../firestore/types";

const toIso = (value: any | undefined | null): string | null => {
  if (!value) return null;
  try {
    if (typeof value?.toDate === "function") {
      // Firestore Timestamp-like
      const d = value.toDate();
      return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
    }
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string") return value;
    // Fallback
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
};

const toTs = (value: string | null | undefined): any => {
  // Consumer treats this as Firestore Timestamp; a Date is acceptable where only toDate() is used via helper
  return value ? (new Date(value) as any) : (new Date() as any);
};

export class TournamentService {
  static async reflectUserProfile(
    userId: string,
    displayName?: string,
    photoURL?: string,
  ): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    await supabase
      .from("tournament_participants")
      .update({ userName: displayName ?? null, userAvatar: photoURL ?? null })
      .eq("userId", userId);
    await supabase
      .from("tournament_messages")
      .update({
        authorName: displayName ?? null,
        authorAvatar: photoURL ?? null,
      })
      .eq("authorId", userId);
  }

  // DBスキーマに存在する列だけを明示ホワイトリストで受け付ける
  static async createTournament(tournamentData: {
    name: string;
    description?: string;
    ownerId: string;
    status: "upcoming" | "active" | "completed" | "cancelled";
    recruitmentOpen: boolean;
    startDate?: Date | string;
    endDate?: Date | string;
  }): Promise<string> {
    if (!supabaseConfig?.isConfigured) {
      console.warn(
        "[TournamentService] Supabase未設定のためcreateTournamentは実行されません（開発用フォールバック）",
      );
      return "dev-placeholder-id";
    }
    const now = new Date().toISOString();
    const payload = {
      name: tournamentData.name,
      description: tournamentData.description ?? null,
      ownerId: tournamentData.ownerId,
      status: tournamentData.status,
      recruitmentOpen: !!tournamentData.recruitmentOpen,
      startDate: toIso(tournamentData.startDate as any),
      endDate: toIso(tournamentData.endDate as any),
      createdAt: now,
      updatedAt: now,
    } as const;
    const { data, error } = await supabase
      .from("tournaments")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return (data as any).id as string;
  }

  static async getTournaments(): Promise<FirestoreTournament[]> {
    if (!supabaseConfig?.isConfigured) return [];
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("createdAt", { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({
      ...row,
      startDate: toTs(row.startDate),
      endDate: toTs(row.endDate),
      createdAt: toTs(row.createdAt),
      updatedAt: toTs(row.updatedAt),
    })) as FirestoreTournament[];
  }

  static async getTournament(
    tournamentId: string,
  ): Promise<FirestoreTournament | null> {
    if (!supabaseConfig?.isConfigured) return null;
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row: any = data;
    return {
      ...row,
      startDate: toTs(row.startDate),
      endDate: toTs(row.endDate),
      createdAt: toTs(row.createdAt),
      updatedAt: toTs(row.updatedAt),
    } as FirestoreTournament;
  }

  static async deleteTournament(tournamentId: string): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const tournament = await this.getTournament(tournamentId);
    if (!tournament)
      throw new FirestoreError("大会が見つかりません", "not-found");
    const currentUserId = await FirestoreUserService.getCurrentUserId();
    if (tournament.ownerId !== currentUserId)
      throw new FirestoreError("削除権限がありません", "permission-denied");

    const delParts = await supabase
      .from("tournament_participants")
      .delete()
      .eq("tournamentId", tournamentId);
    if (delParts.error) throw delParts.error;
    const delMsgs = await supabase
      .from("tournament_messages")
      .delete()
      .eq("tournamentId", tournamentId);
    if (delMsgs.error) throw delMsgs.error;
    const delReqs = await supabase
      .from("tournament_join_requests")
      .delete()
      .eq("tournamentId", tournamentId);
    if (delReqs.error) throw delReqs.error;
    const delTournament = await supabase
      .from("tournaments")
      .delete()
      .eq("id", tournamentId);
    if (delTournament.error) throw delTournament.error;
  }

  static async joinTournament(
    tournamentId: string,
    userId?: string,
    userName?: string,
    userAvatar?: string,
  ): Promise<string> {
    if (!supabaseConfig?.isConfigured)
      throw new FirestoreError(
        "Supabase未設定です。環境変数を設定してください。",
        "unavailable",
      );
    const t = await this.getTournament(tournamentId);
    if (!t) throw new FirestoreError("大会が見つかりません", "not-found");
    if (t.recruitmentOpen === false) {
      throw new FirestoreError("現在この大会は募集停止中です", "unavailable");
    }

    const now = new Date().toISOString();
    const id = userId || (await FirestoreUserService.getCurrentUserId());
    const name = userName || (await FirestoreUserService.getCurrentUserName());
    const avatar =
      userAvatar || (await FirestoreUserService.getCurrentUserAvatar());

    const { data, error } = await supabase
      .from("tournament_participants")
      .insert({
        tournamentId,
        userId: id,
        userName: name,
        userAvatar: avatar ?? null,
        status: "joined",
        joinedAt: now,
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data as any).id as string;
  }

  static async requestJoin(
    tournamentId: string,
    userId?: string,
    userName?: string,
    userAvatar?: string,
  ): Promise<string> {
    if (!supabaseConfig?.isConfigured)
      throw new FirestoreError(
        "Supabase未設定です。環境変数を設定してください。",
        "unavailable",
      );
    const now = new Date().toISOString();
    const id = userId || (await FirestoreUserService.getCurrentUserId());
    const name = userName || (await FirestoreUserService.getCurrentUserName());
    const avatar =
      userAvatar || (await FirestoreUserService.getCurrentUserAvatar());
    const { data, error } = await supabase
      .from("tournament_join_requests")
      .insert({
        tournamentId,
        userId: id,
        userName: name,
        userAvatar: avatar ?? null,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data as any).id as string;
  }

  static async approveJoinRequest(requestId: string): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const { data: req, error: reqErr } = await supabase
      .from("tournament_join_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();
    if (reqErr) throw reqErr;
    if (!req) throw new FirestoreError("参加申請が見つかりません", "not-found");

    const request = req as FirestoreTournamentJoinRequest;
    const tournament = await this.getTournament(request.tournamentId);
    if (!tournament)
      throw new FirestoreError("大会が見つかりません", "not-found");
    const currentUserId = await FirestoreUserService.getCurrentUserId();
    if (tournament.ownerId !== currentUserId)
      throw new FirestoreError("承認権限がありません", "permission-denied");

    const now = new Date().toISOString();
    const updReq = await supabase
      .from("tournament_join_requests")
      .update({ status: "approved", updatedAt: now })
      .eq("id", requestId);
    if (updReq.error) throw updReq.error;

    const upsertPart = await supabase.from("tournament_participants").upsert(
      {
        tournamentId: request.tournamentId,
        userId: request.userId,
        userName: request.userName,
        userAvatar: request.userAvatar ?? null,
        status: "joined",
        joinedAt: now,
      },
      { onConflict: "tournamentId,userId" as any },
    );
    if (upsertPart.error) throw upsertPart.error;
  }

  static async rejectJoinRequest(requestId: string): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("tournament_join_requests")
      .update({ status: "rejected", updatedAt: now })
      .eq("id", requestId);
    if (error) throw error;
  }

  static subscribeToJoinRequests(
    tournamentId: string,
    callback: (requests: FirestoreTournamentJoinRequest[]) => void,
  ): Unsubscribe {
    if (!supabaseConfig?.isConfigured) {
      callback([] as unknown as FirestoreTournamentJoinRequest[]);
      return () => {};
    }

    let current: FirestoreTournamentJoinRequest[] = [];
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const emit = () => callback([...current]);
    const sortDesc = (a: any, b: any) =>
      String(b.createdAt as any).localeCompare(String(a.createdAt as any));

    const applyChange = (type: "INSERT" | "UPDATE" | "DELETE", row: any) => {
      if (!row || row.tournamentId !== tournamentId) return;
      if (type === "INSERT") {
        const item = { ...row, createdAt: toTs(row.createdAt) } as any;
        current = [item, ...current].sort(sortDesc);
      } else if (type === "UPDATE") {
        const idx = current.findIndex((r) => r.id === row.id);
        const item = { ...row, createdAt: toTs(row.createdAt) } as any;
        if (idx >= 0) {
          const copy = [...current];
          copy[idx] = { ...copy[idx], ...item };
          current = copy.sort(sortDesc);
        } else {
          current = [item, ...current].sort(sortDesc);
        }
      } else if (type === "DELETE") {
        current = current.filter((r) => r.id !== row.id);
      }
      emit();
    };

    const init = async () => {
      const { data, error } = await supabase
        .from("tournament_join_requests")
        .select("*")
        .eq("tournamentId", tournamentId)
        .order("createdAt", { ascending: false });
      if (error) throw error;
      current = (data || []).map((row) => ({
        ...row,
        createdAt: toTs((row as any).createdAt),
      })) as any;
      emit();

      channel = supabase
        .channel(`realtime:tournament_join_requests:${tournamentId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tournament_join_requests",
            filter: `tournamentId=eq.${tournamentId}`,
          },
          (payload: any) => {
            const type = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
            const row =
              (type === "DELETE" ? payload.old : payload.new) || undefined;
            if (!row) return;
            applyChange(type, row);
          },
        )
        .subscribe();
    };

    void init();
    return () => {
      if (channel) channel.unsubscribe();
    };
  }

  static async addMessage(
    tournamentId: string,
    text: string,
    authorId?: string,
    authorName?: string,
    authorAvatar?: string,
  ): Promise<string> {
    if (!supabaseConfig?.isConfigured)
      throw new FirestoreError(
        "Supabase未設定です。環境変数を設定してください。",
        "unavailable",
      );
    const senderId =
      authorId || (await FirestoreUserService.getCurrentUserId());
    const t = await this.getTournament(tournamentId);
    if (!t) throw new FirestoreError("大会が見つかりません", "not-found");
    if (t.ownerId !== senderId) {
      const { data: parts } = await supabase
        .from("tournament_participants")
        .select("id")
        .eq("tournamentId", tournamentId)
        .eq("userId", senderId)
        .eq("status", "joined")
        .limit(1)
        .maybeSingle();
      if (!parts)
        throw new FirestoreError(
          "参加者のみメッセージを送信できます",
          "permission-denied",
        );
    }
    const name =
      authorName || (await FirestoreUserService.getCurrentUserName());
    const avatar =
      authorAvatar || (await FirestoreUserService.getCurrentUserAvatar());
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("tournament_messages")
      .insert({
        tournamentId,
        authorId: senderId,
        authorName: name,
        authorAvatar: avatar ?? null,
        text: text ?? "",
        type: "text",
        createdAt: now,
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data as any).id as string;
  }

  static async sendMessage(
    tournamentId: string,
    text: string,
  ): Promise<string> {
    return await this.addMessage(tournamentId, text);
  }

  static async getRecentMessages(
    tournamentId: string,
    pageSize: number,
    afterCreatedAt?: any,
  ): Promise<{ items: FirestoreTournamentMessage[]; nextCursor?: any }> {
    if (!supabaseConfig?.isConfigured)
      return { items: [], nextCursor: undefined };
    let q = supabase
      .from("tournament_messages")
      .select("*")
      .eq("tournamentId", tournamentId)
      .order("createdAt", { ascending: false })
      .limit(pageSize);
    if (afterCreatedAt) {
      const iso = toIso(afterCreatedAt);
      if (iso) q = q.lt("createdAt", iso);
    }
    const { data, error } = await q;
    if (error) throw error;
    const rows = data || [];
    const items = rows.map((row) => ({
      ...row,
      createdAt: toTs(row.createdAt),
    })) as FirestoreTournamentMessage[];
    const nextCursor =
      rows.length > 0 ? toTs(rows[rows.length - 1].createdAt) : undefined;
    return { items, nextCursor };
  }

  static subscribeToNewMessages(
    tournamentId: string,
    afterCreatedAt: any,
    callback: (messages: FirestoreTournamentMessage[]) => void,
  ): Unsubscribe {
    if (!supabaseConfig?.isConfigured) {
      callback([]);
      return () => {};
    }

    let channel: ReturnType<typeof supabase.channel> | undefined;
    let sinceIso = toIso(afterCreatedAt) || new Date(0).toISOString();

    const onInsert = (row: any) => {
      if (!row || row.tournamentId !== tournamentId) return;
      const created = String(row.createdAt || new Date(0).toISOString());
      if (created <= sinceIso) return;
      sinceIso = created;
      const msg = [{ ...row, createdAt: toTs(row.createdAt) }] as any;
      callback(msg);
    };

    channel = supabase
      .channel(`realtime:tournament_messages:new:${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tournament_messages",
          filter: `tournamentId=eq.${tournamentId}`,
        },
        (payload: any) => {
          const row = payload.new;
          onInsert(row);
        },
      )
      .subscribe();

    return () => {
      if (channel) channel.unsubscribe();
    };
  }

  static subscribeToTournaments(
    callback: (tournaments: FirestoreTournament[]) => void,
  ): Unsubscribe {
    if (!supabaseConfig?.isConfigured) {
      callback([]);
      return () => {};
    }

    let current: FirestoreTournament[] = [];
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const emit = () => callback([...current]);
    const sortDesc = (a: any, b: any) =>
      String(b.createdAt as any).localeCompare(String(a.createdAt as any));

    const applyChange = (type: "INSERT" | "UPDATE" | "DELETE", row: any) => {
      if (!row) return;
      const item = {
        ...row,
        startDate: toTs(row.startDate),
        endDate: toTs(row.endDate),
        createdAt: toTs(row.createdAt),
        updatedAt: toTs(row.updatedAt),
      } as any;
      if (type === "INSERT") {
        current = [item, ...current].sort(sortDesc);
      } else if (type === "UPDATE") {
        const idx = current.findIndex((r) => r.id === row.id);
        if (idx >= 0) {
          const copy = [...current];
          copy[idx] = { ...copy[idx], ...item };
          current = copy.sort(sortDesc);
        } else {
          current = [item, ...current].sort(sortDesc);
        }
      } else if (type === "DELETE") {
        current = current.filter((r) => r.id !== row.id);
      }
      emit();
    };

    const init = async () => {
      const list = await this.getTournaments();
      current = list;
      emit();
      channel = supabase
        .channel("realtime:tournaments")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tournaments" },
          (payload: any) => {
            const type = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
            const row =
              (type === "DELETE" ? payload.old : payload.new) || undefined;
            if (!row) return;
            applyChange(type, row);
          },
        )
        .subscribe();
    };

    void init();

    return () => {
      if (channel) channel.unsubscribe();
    };
  }

  static async setRecruitmentOpen(
    tournamentId: string,
    open: boolean,
  ): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const tournament = await this.getTournament(tournamentId);
    if (!tournament)
      throw new FirestoreError("大会が見つかりません", "not-found");
    const currentUserId = await FirestoreUserService.getCurrentUserId();
    if (tournament.ownerId !== currentUserId)
      throw new FirestoreError("操作権限がありません", "permission-denied");
    const { error } = await supabase
      .from("tournaments")
      .update({ recruitmentOpen: open, updatedAt: new Date().toISOString() })
      .eq("id", tournamentId);
    if (error) throw error;
  }

  static async getTournamentParticipants(
    tournamentId: string,
  ): Promise<StrictTournamentParticipant[]> {
    if (!supabaseConfig?.isConfigured) return [];
    const { data, error } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournamentId", tournamentId)
      .order("joinedAt", { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      tournamentId: row.tournamentId,
      userId: row.userId,
      userName: row.userName,
      userAvatar: row.userAvatar ?? undefined,
      status: row.status,
      joinedAt: new Date(row.joinedAt),
      leftAt: row.leftAt ? new Date(row.leftAt) : null,
      progressPercent: row.progressPercent,
      currentDay: row.currentDay,
    })) as StrictTournamentParticipant[];
  }

  static subscribeToParticipants(
    tournamentId: string,
    callback: (participants: FirestoreTournamentParticipant[]) => void,
  ): Unsubscribe {
    if (!supabaseConfig?.isConfigured) {
      callback([] as unknown as FirestoreTournamentParticipant[]);
      return () => {};
    }

    let current: FirestoreTournamentParticipant[] = [];
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const emit = () => callback([...current]);
    const sortAsc = (a: any, b: any) =>
      String(a.joinedAt as any).localeCompare(String(b.joinedAt as any));

    const applyChange = (type: "INSERT" | "UPDATE" | "DELETE", row: any) => {
      if (!row || row.tournamentId !== tournamentId) return;
      const item = {
        id: row.id,
        tournamentId: row.tournamentId,
        userId: row.userId,
        userName: row.userName,
        userAvatar: row.userAvatar ?? undefined,
        status: row.status,
        joinedAt: toTs(row.joinedAt),
        leftAt: row.leftAt ? toTs(row.leftAt) : undefined,
        progressPercent: row.progressPercent,
        currentDay: row.currentDay,
      } as any;
      if (type === "INSERT") {
        current = [...current, item].sort(sortAsc);
      } else if (type === "UPDATE") {
        const idx = current.findIndex((p) => p.id === row.id);
        if (idx >= 0) {
          const copy = [...current];
          copy[idx] = { ...copy[idx], ...item };
          current = copy.sort(sortAsc);
        } else {
          current = [...current, item].sort(sortAsc);
        }
      } else if (type === "DELETE") {
        current = current.filter((p) => p.id !== row.id);
      }
      emit();
    };

    const init = async () => {
      const { data, error } = await supabase
        .from("tournament_participants")
        .select("*")
        .eq("tournamentId", tournamentId)
        .order("joinedAt", { ascending: true });
      if (error) throw error;
      current = (data || []).map((row) => ({
        id: (row as any).id,
        tournamentId: (row as any).tournamentId,
        userId: (row as any).userId,
        userName: (row as any).userName,
        userAvatar: (row as any).userAvatar ?? undefined,
        status: (row as any).status,
        joinedAt: toTs((row as any).joinedAt),
        leftAt: (row as any).leftAt ? toTs((row as any).leftAt) : undefined,
        progressPercent: (row as any).progressPercent,
        currentDay: (row as any).currentDay,
      })) as any;
      emit();

      channel = supabase
        .channel(`realtime:tournament_participants:${tournamentId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tournament_participants",
            filter: `tournamentId=eq.${tournamentId}`,
          },
          (payload: any) => {
            const type = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
            const row =
              (type === "DELETE" ? payload.old : payload.new) || undefined;
            if (!row) return;
            applyChange(type, row);
          },
        )
        .subscribe();
    };

    void init();
    return () => {
      if (channel) channel.unsubscribe();
    };
  }

  static async kickParticipant(
    tournamentId: string,
    userId: string,
  ): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const { data, error } = await supabase
      .from("tournament_participants")
      .select("id")
      .eq("tournamentId", tournamentId)
      .eq("userId", userId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return;
    const { error: updErr } = await supabase
      .from("tournament_participants")
      .update({ status: "kicked", leftAt: new Date().toISOString() })
      .eq("id", (data as any).id);
    if (updErr) throw updErr;
  }
}

export default TournamentService;
