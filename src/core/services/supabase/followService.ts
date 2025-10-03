type Unsubscribe = () => void;
import { supabase, supabaseConfig } from "@app/config/supabase.config";

export class FollowService {
  static async getFollowDocId(targetUserId: string): Promise<string> {
    const UserService = (await import("../userService")).default;
    const userService = UserService.getInstance();
    const currentUserId = await userService.getUserId();
    return `${currentUserId}_${targetUserId}`;
  }

  static async isFollowing(targetUserId: string): Promise<boolean> {
    if (!supabaseConfig?.isConfigured) return false;
    const UserService = (await import("../userService")).default;
    const userService = UserService.getInstance();
    const currentUserId = await userService.getUserId();
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
    const UserService = (await import("../userService")).default;
    const userService = UserService.getInstance();
    const currentUserId = await userService.getUserId();
    const id = `${currentUserId}_${targetUserId}`;
    const { error } = await supabase
      .from("follows")
      .upsert({ id, followerId: currentUserId, followeeId: targetUserId })
      .single();
    if (error) throw error;
  }

  static async unfollow(targetUserId: string): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const UserService = (await import("../userService")).default;
    const userService = UserService.getInstance();
    const currentUserId = await userService.getUserId();
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
    let cancelled = false;
    let timer: any;

    const tick = async () => {
      try {
        const userIds = await FollowService.getFollowingUserIds(followerId);
        if (!cancelled) callback(userIds);
      } catch {
        // ignore
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
