type Unsubscribe = () => void;
import { supabase, supabaseConfig } from "@app/config/supabase.config";
import type { CommunityComment } from "@project-types";

import type { FirestoreCommunityPost } from "../firestore/types";
import ProfileCache from "../profileCache";

type SupaPostRow = {
  id: string;
  authorId: string;
  authorName: string | null;
  authorAvatar: string | null;
  title: string | null;
  content: string;
  imageUrl: string | null;
  likes: number;
  comments: number;
  createdAt: string;
  updatedAt: string;
};

const toFirestoreCommunityPost = (row: SupaPostRow): FirestoreCommunityPost => {
  return {
    id: row.id,
    authorId: row.authorId,
    authorName: row.authorName ?? "ユーザー",
    authorAvatar: row.authorAvatar ?? undefined,
    title: row.title ?? undefined,
    content: row.content,
    imageUrl: row.imageUrl ?? undefined,
    likes: row.likes,
    comments: row.comments,
    createdAt: new Date(row.createdAt) as any,
    updatedAt: new Date(row.updatedAt) as any,
  } as FirestoreCommunityPost;
};

export class CommunityService {
  static async reflectUserProfile(
    userId: string,
    displayName?: string,
    photoURL?: string,
  ): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    await supabase
      .from("community_posts")
      .update({
        authorName: displayName ?? null,
        authorAvatar: photoURL ?? null,
      })
      .eq("authorId", userId);
    await supabase
      .from("community_comments")
      .update({
        authorName: displayName ?? null,
        authorAvatar: photoURL ?? null,
      })
      .eq("authorId", userId);
  }
  static async getRecentPostsPage(
    pageSize: number,
    after?: { id?: string; createdAt?: string },
  ): Promise<{ items: FirestoreCommunityPost[]; nextCursor?: any }> {
    if (!supabaseConfig?.isConfigured)
      return { items: [], nextCursor: undefined };
    let query = supabase
      .from("community_posts")
      .select("*")
      .order("createdAt", { ascending: false })
      .limit(pageSize);

    if (after?.createdAt) {
      query = query.lt("createdAt", after.createdAt);
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []) as unknown as SupaPostRow[];
    const items = rows.map(toFirestoreCommunityPost);
    const nextCursor =
      items.length > 0
        ? {
            id: rows[rows.length - 1].id,
            createdAt: rows[rows.length - 1].createdAt,
          }
        : undefined;
    return { items, nextCursor };
  }

  static async getUserPosts(userId: string): Promise<FirestoreCommunityPost[]> {
    if (!supabaseConfig?.isConfigured) return [];
    const { data, error } = await supabase
      .from("community_posts")
      .select("*")
      .eq("authorId", userId)
      .order("createdAt", { ascending: false });
    if (error) throw error;
    return ((data || []) as unknown as SupaPostRow[]).map(
      toFirestoreCommunityPost,
    );
  }

  static async addPost(data: { content: string }): Promise<string> {
    if (!supabaseConfig?.isConfigured) return "dev-placeholder-id";
    const UserService = (await import("../userService")).default;
    const userService = UserService.getInstance();
    const authorId = await userService.getUserId();
    const authorName = await userService.getUserName();
    const authorAvatar = await userService.getAvatarUrl();

    const now = new Date().toISOString();
    const { data: inserted, error } = await supabase
      .from("community_posts")
      .insert({
        authorId,
        authorName: authorName || "ユーザー",
        authorAvatar: authorAvatar ?? null,
        title: "",
        content: data.content,
        imageUrl: null,
        likes: 0,
        comments: 0,
        createdAt: now,
        updatedAt: now,
      })
      .select("id")
      .single();
    if (error) throw error;
    return inserted.id as string;
  }

  static async addReply(
    postId: string,
    data: { content: string },
  ): Promise<string> {
    if (!supabaseConfig?.isConfigured) return "dev-placeholder-id";
    const UserService = (await import("../userService")).default;
    const userService = UserService.getInstance();
    const authorId = await userService.getUserId();
    const authorName = await userService.getUserName();
    const authorAvatar = await userService.getAvatarUrl();
    const now = new Date().toISOString();

    const { data: inserted, error } = await supabase
      .from("community_comments")
      .insert({
        postId,
        authorId,
        authorName: authorName || "ユーザー",
        authorAvatar: authorAvatar ?? null,
        content: data.content,
        createdAt: now,
        updatedAt: now,
      })
      .select("id")
      .single();
    if (error) throw error;
    await this.updatePostReplyCount(postId, 1);
    return inserted.id as string;
  }

  static async deleteReply(replyId: string, postId: string): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const { error } = await supabase
      .from("community_comments")
      .delete()
      .eq("id", replyId);
    if (error) throw error;
    await this.updatePostReplyCount(postId, -1);
  }

  static async deletePost(postId: string): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    // Delete comments first (no cascade by default)
    const delReplies = await supabase
      .from("community_comments")
      .delete()
      .eq("postId", postId);
    if (delReplies.error) throw delReplies.error;
    const delPost = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId);
    if (delPost.error) throw delPost.error;
  }

  static async updatePostReplyCount(
    postId: string,
    delta: number,
  ): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const { error } = await supabase.rpc("increment_post_comments", {
      p_post_id: postId,
      p_delta: delta,
    });
    if (error) {
      // Fallback: read-modify-write
      try {
        const { data: row, error: selErr } = await supabase
          .from("community_posts")
          .select("comments")
          .eq("id", postId)
          .maybeSingle();
        if (selErr) throw selErr;
        if (!row) return;
        const next = Math.max(0, (row as any).comments * 1 + delta);
        await supabase
          .from("community_posts")
          .update({ comments: next, updatedAt: new Date().toISOString() })
          .eq("id", postId);
      } catch {
        // ignore
      }
    }
  }

  static async getPostReplies(postId: string): Promise<CommunityComment[]> {
    if (!supabaseConfig?.isConfigured) return [];
    const { data, error } = await supabase
      .from("community_comments")
      .select("*")
      .eq("postId", postId)
      .order("createdAt", { ascending: true });
    if (error) throw error;
    return (data || []) as unknown as CommunityComment[];
  }

  static subscribeToPostReplies(
    postId: string,
    callback: (replies: CommunityComment[]) => void,
  ): Unsubscribe {
    if (!supabaseConfig?.isConfigured) {
      callback([]);
      return () => {};
    }
    let cancelled = false;
    let timer: any;

    const tick = async () => {
      try {
        const replies = await this.getPostReplies(postId);
        if (!cancelled) callback(replies);
      } catch {
        if (!cancelled) callback([]);
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

  static subscribeToRecentPosts(
    callback: (posts: FirestoreCommunityPost[]) => void,
    max: number = 200,
  ): Unsubscribe {
    if (!supabaseConfig?.isConfigured) {
      callback([]);
      return () => {};
    }
    let cancelled = false;
    let timer: any;

    const tick = async () => {
      try {
        const { data, error } = await supabase
          .from("community_posts")
          .select("*")
          .order("createdAt", { ascending: false })
          .limit(max);
        if (!cancelled) {
          if (error) throw error;
          const posts = ((data || []) as unknown as SupaPostRow[]).map(
            toFirestoreCommunityPost,
          );
          // merge live profile cache
          const ids = posts.map((p) => p.authorId);
          ProfileCache.getInstance().subscribeMany(ids, (map) => {
            const merged = posts.map((p) => ({
              ...p,
              authorName:
                map?.get(p.authorId)?.displayName ?? p.authorName ?? "ユーザー",
              authorAvatar:
                map?.get(p.authorId)?.photoURL ?? p.authorAvatar ?? undefined,
            }));
            callback(merged);
          });
        }
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

  static subscribeToUserPosts(
    userId: string,
    callback: (posts: FirestoreCommunityPost[]) => void,
  ): Unsubscribe {
    if (!supabaseConfig?.isConfigured) {
      callback([]);
      return () => {};
    }
    let cancelled = false;
    let timer: any;

    const tick = async () => {
      try {
        const { data, error } = await supabase
          .from("community_posts")
          .select("*")
          .eq("authorId", userId)
          .order("createdAt", { ascending: false });
        if (!cancelled) {
          if (error) throw error;
          const posts = ((data || []) as unknown as SupaPostRow[]).map(
            toFirestoreCommunityPost,
          );
          const ids = posts.map((p) => p.authorId);
          ProfileCache.getInstance().subscribeMany(ids, (map) => {
            const merged = posts.map((p) => ({
              ...p,
              authorName:
                map?.get(p.authorId)?.displayName ?? p.authorName ?? "ユーザー",
              authorAvatar:
                map?.get(p.authorId)?.photoURL ?? p.authorAvatar ?? undefined,
            }));
            callback(merged);
          });
        }
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

  static subscribeToFollowingPosts(
    userIds: string[],
    callback: (posts: FirestoreCommunityPost[]) => void,
  ): Unsubscribe {
    if (!supabaseConfig?.isConfigured) {
      callback([]);
      return () => {};
    }
    let cancelled = false;
    let timer: any;

    const tick = async () => {
      try {
        if (userIds.length === 0) {
          if (!cancelled) callback([]);
          return;
        }
        const { data, error } = await supabase
          .from("community_posts")
          .select("*")
          .in("authorId", userIds)
          .order("createdAt", { ascending: false });
        if (error) throw error;
        const posts = ((data || []) as unknown as SupaPostRow[]).map(
          toFirestoreCommunityPost,
        );
        if (!cancelled) callback(posts);
      } catch {
        if (!cancelled) callback([]);
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

  static async toggleLike(postId: string): Promise<boolean> {
    if (!supabaseConfig?.isConfigured) return false;
    const UserService = (await import("../userService")).default;
    const userService = UserService.getInstance();
    const userId = await userService.getUserId();
    const likeId = `${userId}_${postId}`;

    const { data: existing } = await supabase
      .from("community_likes")
      .select("id")
      .eq("id", likeId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("community_likes")
        .delete()
        .eq("id", likeId);
      if (error) throw error;
      await this.updatePostLikeCount(postId, -1);
      return false;
    }

    const { error } = await supabase
      .from("community_likes")
      .insert({ id: likeId, userId, postId });
    if (error) throw error;
    await this.updatePostLikeCount(postId, 1);
    return true;
  }

  static async updatePostLikeCount(
    postId: string,
    delta: number,
  ): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const { error } = await supabase.rpc("increment_post_likes", {
      p_post_id: postId,
      p_delta: delta,
    });
    if (error) {
      // Fallback: read-modify-write
      try {
        const { data: row, error: selErr } = await supabase
          .from("community_posts")
          .select("likes")
          .eq("id", postId)
          .maybeSingle();
        if (selErr) throw selErr;
        if (!row) return;
        const next = Math.max(0, (row as any).likes * 1 + delta);
        await supabase
          .from("community_posts")
          .update({ likes: next, updatedAt: new Date().toISOString() })
          .eq("id", postId);
      } catch {
        // ignore
      }
    }
  }

  static async isPostLikedByUser(
    postId: string,
    userId: string,
  ): Promise<boolean> {
    if (!supabaseConfig?.isConfigured) return false;
    const { data, error } = await supabase
      .from("community_likes")
      .select("id")
      .eq("id", `${userId}_${postId}`)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }
}
