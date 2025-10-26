type Unsubscribe = () => void;
import { supabase, supabaseConfig } from "@app/config/supabase.config";
import { Logger } from "@shared/utils/logger";

import { FollowService } from "./followService";

export class BlockService {
  static async getBlockDocId(targetUserId: string): Promise<string> {
    const { data: s } = await supabase.auth.getSession();
    const currentUserId = s?.session?.user?.id;
    if (!currentUserId) throw new Error("AUTH_REQUIRED");
    return `${currentUserId}_${targetUserId}`;
  }

  static async isBlocked(targetUserId: string): Promise<boolean> {
    if (!supabaseConfig?.isConfigured) return false;
    const { data: s } = await supabase.auth.getSession();
    const currentUserId = s?.session?.user?.id;
    if (!currentUserId) return false;
    const id = `${currentUserId}_${targetUserId}`;
    const { data, error } = await supabase
      .from("blocks")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }

  static async block(targetUserId: string): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const { data: s } = await supabase.auth.getSession();
    const currentUserId = s?.session?.user?.id;
    if (!currentUserId) throw new Error("AUTH_REQUIRED");
    const id = `${currentUserId}_${targetUserId}`;
    const { error } = await supabase
      .from("blocks")
      .upsert({ id, blockerId: currentUserId, blockedId: targetUserId })
      .single();
    if (error) throw error;

    // Best-effort: when blocking a user, also unfollow them to keep UI/feeds consistent
    try {
      await FollowService.unfollow(targetUserId);
    } catch {
      // ignore follow-unfollow errors; block should still succeed
    }
  }

  static async unblock(targetUserId: string): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const { data: s } = await supabase.auth.getSession();
    const currentUserId = s?.session?.user?.id;
    if (!currentUserId) throw new Error("AUTH_REQUIRED");
    const id = `${currentUserId}_${targetUserId}`;
    const { error } = await supabase.from("blocks").delete().eq("id", id);
    if (error) throw error;
  }

  static subscribeBlockedIds(
    userId: string,
    callback: (blockedIds: string[]) => void,
  ): Unsubscribe {
    if (!supabaseConfig?.isConfigured) {
      callback([]);
      return () => {};
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        const uid = s?.session?.user?.id || userId;
        const { data, error } = await supabase
          .from("blocks")
          .select("blockedId")
          .eq("blockerId", uid);
        if (error) throw error;
        if (!cancelled)
          callback((data || []).map((r: { blockedId: string }) => r.blockedId));
      } catch (e) {
        Logger.warn("BlockService.tick", e);
      } finally {
        if (!cancelled)
          timer = setTimeout(() => {
            void tick();
          }, 5000);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }
}
