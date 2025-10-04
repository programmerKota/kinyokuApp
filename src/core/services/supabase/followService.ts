type Unsubscribe = () => void;
import { supabase, supabaseConfig } from "@app/config/supabase.config";

export class FollowService {
  static async getFollowDocId(targetUserId: string): Promise<string> {
    const { data: s } = await supabase.auth.getSession();
    const currentUserId = s?.session?.user?.id as string | undefined;
    if (!currentUserId) throw new Error("AUTH_REQUIRED");
    return `${currentUserId}_${targetUserId}`;
  }

  static async isFollowing(targetUserId: string): Promise<boolean> {
    if (!supabaseConfig?.isConfigured) return false;
    const { data: s } = await supabase.auth.getSession();
    const currentUserId = s?.session?.user?.id as string | undefined;
    if (!currentUserId) return false;
    const id = `${currentUserId}_${targetUserId}`;
    const { data, error } = await supabase
      .from("follows")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }

  static async follow(targetUserId: string): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const { data: s } = await supabase.auth.getSession();
    const currentUserId = s?.session?.user?.id as string | undefined;
    if (!currentUserId) throw new Error("AUTH_REQUIRED");
    const id = `${currentUserId}_${targetUserId}`;
    const { error } = await supabase
      .from("follows")
      .upsert({ id, followerId: currentUserId, followeeId: targetUserId })
      .single();
    if (error) throw error;
  }

  static async unfollow(targetUserId: string): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const { data: s } = await supabase.auth.getSession();
    const currentUserId = s?.session?.user?.id as string | undefined;
    if (!currentUserId) throw new Error("AUTH_REQUIRED");
    const id = `${currentUserId}_${targetUserId}`;
    const { error } = await supabase.from("follows").delete().eq("id", id);
    if (error) throw error;
  }

  static async getFollowingUserIds(followerId: string): Promise<string[]> {
    if (!supabaseConfig?.isConfigured) return [];
    const { data, error } = await supabase
      .from("follows")
      .select("followeeId")
      .eq("followerId", followerId);
    if (error) throw error;
    return (data || []).map((r: any) => r.followeeId as string);
  }

  static subscribeToFollowingUserIds(
    followerId: string,
    callback: (userIds: string[]) => void,
  ): Unsubscribe {
    if (!supabaseConfig?.isConfigured) {
      callback([]);
      return () => {};
    }

    let channel: ReturnType<typeof supabase.channel> | undefined;

    const init = async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        const uid = (s?.session?.user?.id as string | undefined) || followerId;
        const userIds = await FollowService.getFollowingUserIds(uid);
        callback(userIds);
      } catch {
        callback([]);
      }

      channel = supabase
        .channel(`realtime:follows:${followerId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "follows",
            filter: `followerId=eq.${followerId}`,
          },
          async (payload: any) => {
            const row = (payload.new || payload.old) as
              | { followerId?: string }
              | undefined;
            if (!row) return;
            const { data: s2 } = await supabase.auth.getSession();
            const uid = (s2?.session?.user?.id as string | undefined) || followerId;
            if ((row.followerId as any) !== uid) return;
            try {
              const userIds = await FollowService.getFollowingUserIds(uid);
              callback(userIds);
            } catch {
              // ignore
            }
          },
        )
        .subscribe();
    };

    void init();
    return () => {
      if (channel) channel.unsubscribe();
    };
  }

  static async followUser(
    followerId: string,
    followeeId: string,
  ): Promise<void> {
    const docId = `${followerId}_${followeeId}`;
    const { error } = await supabase
      .from("follows")
      .upsert({ id: docId, followerId, followeeId })
      .single();
    if (error) throw error;
  }

  static async unfollowUser(
    followerId: string,
    followeeId: string,
  ): Promise<void> {
    const docId = `${followerId}_${followeeId}`;
    const { error } = await supabase.from("follows").delete().eq("id", docId);
    if (error) throw error;
  }
}
