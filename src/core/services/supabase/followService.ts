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
    const rows = (data ?? []) as Array<{ followeeId: string }>;
    return rows.map((r) => r.followeeId);
  }

  static async getFollowerUserIds(followeeId: string): Promise<string[]> {
    if (!supabaseConfig?.isConfigured) return [];
    const { data, error } = await supabase
      .from("follows")
      .select("followerId")
      .eq("followeeId", followeeId);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ followerId: string }>;
    return rows.map((r) => r.followerId);
  }

  // 指定ユーザーのフォロー数/フォロワー数を取得
  static async getCounts(
    userId: string,
  ): Promise<{ following: number; followers: number }> {
    if (!supabaseConfig?.isConfigured) return { following: 0, followers: 0 };
    // following: ユーザーがフォローしている人数（followerId = userId）
    const followingQuery = supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("followerId", userId);
    // followers: ユーザーをフォローしている人数（followeeId = userId）
    const followersQuery = supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("followeeId", userId);

    const [followingRes, followersRes] = await Promise.all([
      followingQuery,
      followersQuery,
    ]);
    if (followingRes.error) throw followingRes.error;
    if (followersRes.error) throw followersRes.error;

    // count は number | null
    return {
      following: (followingRes.count ?? 0) as number,
      followers: (followersRes.count ?? 0) as number,
    };
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
      // Always respect the followerId argument (閲覧対象のユーザー)
      const effectiveFollowerId = followerId;

      // Initial emit
      try {
        const userIds =
          await FollowService.getFollowingUserIds(effectiveFollowerId);
        callback(userIds);
      } catch (_e) {
        callback([]);
      }

      // Subscribe to changes for the effective follower ID so follow/unfollow reflects immediately
      channel = supabase
        .channel(`realtime:follows:${effectiveFollowerId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "follows",
            filter: `followerId=eq.${effectiveFollowerId}`,
          },
          async (_payload: unknown) => {
            try {
              const userIds =
                await FollowService.getFollowingUserIds(effectiveFollowerId);
              callback(userIds);
            } catch (_e) {
              // ignore
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "follows",
            filter: `followerId=eq.${effectiveFollowerId}`,
          },
          async (_payload: unknown) => {
            try {
              const userIds =
                await FollowService.getFollowingUserIds(effectiveFollowerId);
              callback(userIds);
            } catch {
              /* ignore */
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

  static subscribeToFollowerUserIds(
    followeeId: string,
    callback: (userIds: string[]) => void,
  ): Unsubscribe {
    if (!supabaseConfig?.isConfigured) {
      callback([]);
      return () => {};
    }

    let channel: ReturnType<typeof supabase.channel> | undefined;

    const init = async () => {
      // Initial emit
      try {
        const userIds = await FollowService.getFollowerUserIds(followeeId);
        callback(userIds);
      } catch {
        callback([]);
      }

      channel = supabase
        .channel(`realtime:follows:followers:${followeeId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "follows",
            filter: `followeeId=eq.${followeeId}`,
          },
          async () => {
            try {
              const userIds =
                await FollowService.getFollowerUserIds(followeeId);
              callback(userIds);
            } catch {
              // ignore
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "follows",
            filter: `followeeId=eq.${followeeId}`,
          },
          async () => {
            try {
              const userIds =
                await FollowService.getFollowerUserIds(followeeId);
              callback(userIds);
            } catch {
              /* ignore */
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
