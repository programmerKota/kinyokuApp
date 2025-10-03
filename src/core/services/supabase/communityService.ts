type Unsubscribe = () => void;
import { supabase, supabaseConfig } from "@app/config/supabase.config";
import type { CommunityComment } from "@project-types";

import type { FirestoreCommunityPost } from "../firestore/types";
import ProfileCache from "../profileCache";
import { withRetry } from "@shared/utils/net";

const isHttpUrl = (v?: string | null) =>
  typeof v === "string" && /^https?:\/\//i.test(v);

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
        authorAvatar: isHttpUrl(photoURL ?? undefined) ? photoURL : null,
      })
      .eq("authorId", userId);
    await supabase
      .from("community_comments")
      .update({
        authorName: displayName ?? null,
        authorAvatar: isHttpUrl(photoURL ?? undefined) ? photoURL : null,
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

    const { data, error } = await withRetry(() => query, {
      retries: 2,
      delayMs: 400,
    });
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
    const { data, error } = await withRetry(
      () =>
        supabase
          .from("community_posts")
          .select("*")
          .eq("authorId", userId)
          .order("createdAt", { ascending: false }),
      { retries: 2, delayMs: 400 },
    );
    if (error) throw error;
    return ((data || []) as unknown as SupaPostRow[]).map(
      toFirestoreCommunityPost,
    );
  }

  static async addPost(data: { content: string }): Promise<string> {
    if (!supabaseConfig?.isConfigured) return "dev-placeholder-id";
    const { data: s } = await supabase.auth.getSession();
    const authorId = s?.session?.user?.id as string | undefined;
    if (!authorId) throw new Error("AUTH_REQUIRED");
    const authorName = null;
    const authorAvatar = null;

    const now = new Date().toISOString();
    const { data: inserted, error } = await supabase
      .from("community_posts")
      .insert({
        authorId,
        authorName,
        authorAvatar,
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
    const { data: s } = await supabase.auth.getSession();
    const authorId = s?.session?.user?.id as string | undefined;
    if (!authorId) throw new Error("AUTH_REQUIRED");
    let authorName: string | null = null;
    let authorAvatar: string | null = null;
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("displayName, photoURL")
        .eq("id", authorId)
        .maybeSingle();
      if (prof) {
        authorName = (prof as any).displayName ?? null;
        authorAvatar = (prof as any).photoURL ?? null;
      }
    } catch {
      // ignore
    }
    const now = new Date().toISOString();

    const { data: inserted, error } = await supabase
      .from("community_comments")
      .insert({
        postId,
        authorId,
        authorName,
        authorAvatar,
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

    let current: CommunityComment[] = [];
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let profileUnsub: Unsubscribe | undefined;

    const emitWithProfiles = () => {
      // Emit immediately with current data; UI will fallback author name/avatar.
      try {
        callback([...current]);
      } catch {}
      if (profileUnsub) {
        try {
          profileUnsub();
        } catch {}
      }
      const ids = current.map((r) => r.authorId);
      profileUnsub = ProfileCache.getInstance().subscribeMany(ids, (map) => {
        const merged = current.map((r) => ({
          ...r,
          authorName:
            map?.get(r.authorId)?.displayName ?? r.authorName ?? "ユーザー",
          authorAvatar:
            map?.get(r.authorId)?.photoURL ?? r.authorAvatar ?? undefined,
        }));
        callback(merged as any);
      });
    };

    const applyChange = (type: "INSERT" | "UPDATE" | "DELETE", row: any) => {
      if (!row) return;
      if (type === "INSERT") {
        if (row.postId !== postId) return;
        current = [...current, row].sort((a, b) =>
          String(a.createdAt).localeCompare(String(b.createdAt)),
        );
      } else if (type === "UPDATE") {
        const idx = current.findIndex((r) => r.id === row.id);
        if (idx >= 0) {
          const copy = [...current];
          copy[idx] = { ...copy[idx], ...row } as any;
          current = copy;
        } else if (row.postId === postId) {
          current = [...current, row].sort((a, b) =>
            String(a.createdAt).localeCompare(String(b.createdAt)),
          );
        }
      } else if (type === "DELETE") {
        current = current.filter((r) => r.id !== row.id);
      }
      emitWithProfiles();
    };

    const init = async () => {
      const list = await this.getPostReplies(postId);
      current = list;
      emitWithProfiles();

      channel = supabase
        .channel(`realtime:community_comments:${postId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "community_comments",
          },
          (payload: any) => {
            const type = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
            const row =
              (type === "DELETE" ? payload.old : payload.new) || undefined;
            if (!row) return;
            if ((row as any).postId !== postId) return;
            applyChange(type, row);
          },
        )
        .subscribe();
    };

    void init();

    return () => {
      if (channel) channel.unsubscribe();
      if (profileUnsub) profileUnsub();
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

    let current: FirestoreCommunityPost[] = [];
    let profileUnsub: Unsubscribe | undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const emitWithProfiles = () => {
      if (profileUnsub) {
        try {
          profileUnsub();
        } catch {}
      }
      const ids = current.map((p) => p.authorId);
      profileUnsub = ProfileCache.getInstance().subscribeMany(ids, (map) => {
        const merged = current.map((p) => ({
          ...p,
          authorName:
            map?.get(p.authorId)?.displayName ?? p.authorName ?? "ユーザー",
          authorAvatar:
            map?.get(p.authorId)?.photoURL ?? p.authorAvatar ?? undefined,
        }));
        callback(merged);
      });
    };

    const applyChange = (type: "INSERT" | "UPDATE" | "DELETE", row: any) => {
      if (!row) return;
      if (type === "INSERT") {
        const post = toFirestoreCommunityPost(row as SupaPostRow);
        current = [post, ...current]
          .sort((a, b) =>
            String(b.createdAt as any).localeCompare(String(a.createdAt as any)),
          )
          .slice(0, max);
      } else if (type === "UPDATE") {
        const idx = current.findIndex((p) => p.id === row.id);
        const nextPost = toFirestoreCommunityPost(row as SupaPostRow);
        if (idx >= 0) {
          const copy = [...current];
          copy[idx] = { ...copy[idx], ...nextPost } as any;
          current = copy
            .sort((a, b) =>
              String(b.createdAt as any).localeCompare(
                String(a.createdAt as any),
              ),
            )
            .slice(0, max);
        } else {
          current = [nextPost, ...current]
            .sort((a, b) =>
              String(b.createdAt as any).localeCompare(
                String(a.createdAt as any),
              ),
            )
            .slice(0, max);
        }
      } else if (type === "DELETE") {
        current = current.filter((p) => p.id !== row.id);
      }
      emitWithProfiles();
    };

    const init = async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("createdAt", { ascending: false })
        .limit(max);
      if (error) throw error;
      current = ((data || []) as unknown as SupaPostRow[]).map(
        toFirestoreCommunityPost,
      );
      emitWithProfiles();

      channel = supabase
        .channel("realtime:community_posts:recent")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "community_posts" },
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
      if (profileUnsub) profileUnsub();
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

    let current: FirestoreCommunityPost[] = [];
    let profileUnsub: Unsubscribe | undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const emitWithProfiles = () => {
      if (profileUnsub) {
        try {
          profileUnsub();
        } catch {}
      }
      const ids = current.map((p) => p.authorId);
      profileUnsub = ProfileCache.getInstance().subscribeMany(ids, (map) => {
        const merged = current.map((p) => ({
          ...p,
          authorName:
            map?.get(p.authorId)?.displayName ?? p.authorName ?? "ユーザー",
          authorAvatar:
            map?.get(p.authorId)?.photoURL ?? p.authorAvatar ?? undefined,
        }));
        callback(merged);
      });
    };

    const applyChange = (type: "INSERT" | "UPDATE" | "DELETE", row: any) => {
      if (!row) return;
      if (row.authorId !== userId) {
        // If updated row moves to/from this author, adjust accordingly
        if (type === "UPDATE") {
          // in case it previously existed in current
          current = current.filter((p) => p.id !== row.id);
          emitWithProfiles();
        }
        return;
      }

      const post = toFirestoreCommunityPost(row as SupaPostRow);
      if (type === "INSERT") {
        current = [post, ...current].sort((a, b) =>
          String(b.createdAt as any).localeCompare(String(a.createdAt as any)),
        );
      } else if (type === "UPDATE") {
        const idx = current.findIndex((p) => p.id === row.id);
        if (idx >= 0) {
          const copy = [...current];
          copy[idx] = { ...copy[idx], ...post } as any;
          current = copy.sort((a, b) =>
            String(b.createdAt as any).localeCompare(String(a.createdAt as any)),
          );
        } else {
          current = [post, ...current].sort((a, b) =>
            String(b.createdAt as any).localeCompare(String(a.createdAt as any)),
          );
        }
      } else if (type === "DELETE") {
        current = current.filter((p) => p.id !== row.id);
      }
      emitWithProfiles();
    };

    const init = async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .eq("authorId", userId)
        .order("createdAt", { ascending: false });
      if (error) throw error;
      current = ((data || []) as unknown as SupaPostRow[]).map(
        toFirestoreCommunityPost,
      );
      emitWithProfiles();

      channel = supabase
        .channel(`realtime:community_posts:user:${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "community_posts" },
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
      if (profileUnsub) profileUnsub();
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

    let current: FirestoreCommunityPost[] = [];
    let profileUnsub: Unsubscribe | undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const emitWithProfiles = () => {
      if (profileUnsub) {
        try {
          profileUnsub();
        } catch {}
      }
      const ids = current.map((p) => p.authorId);
      profileUnsub = ProfileCache.getInstance().subscribeMany(ids, (map) => {
        const merged = current.map((p) => ({
          ...p,
          authorName:
            map?.get(p.authorId)?.displayName ?? p.authorName ?? "ユーザー",
          authorAvatar:
            map?.get(p.authorId)?.photoURL ?? p.authorAvatar ?? undefined,
        }));
        callback(merged);
      });
    };

    const inFollowings = (row: any) =>
      userIds && userIds.length > 0 && userIds.includes(row.authorId);

    const applyChange = (type: "INSERT" | "UPDATE" | "DELETE", row: any) => {
      if (!row) return;
      if (type === "INSERT") {
        if (!inFollowings(row)) return;
        const post = toFirestoreCommunityPost(row as SupaPostRow);
        current = [post, ...current].sort((a, b) =>
          String(b.createdAt as any).localeCompare(String(a.createdAt as any)),
        );
      } else if (type === "UPDATE") {
        const exists = current.some((p) => p.id === row.id);
        const shouldHave = inFollowings(row);
        if (!exists && shouldHave) {
          const post = toFirestoreCommunityPost(row as SupaPostRow);
          current = [post, ...current].sort((a, b) =>
            String(b.createdAt as any).localeCompare(
              String(a.createdAt as any),
            ),
          );
        } else if (exists && !shouldHave) {
          current = current.filter((p) => p.id !== row.id);
        } else if (exists && shouldHave) {
          const post = toFirestoreCommunityPost(row as SupaPostRow);
          const idx = current.findIndex((p) => p.id === row.id);
          const copy = [...current];
          copy[idx] = { ...copy[idx], ...post } as any;
          current = copy.sort((a, b) =>
            String(b.createdAt as any).localeCompare(String(a.createdAt as any)),
          );
        }
      } else if (type === "DELETE") {
        current = current.filter((p) => p.id !== row.id);
      }
      emitWithProfiles();
    };

    const init = async () => {
      if (!userIds || userIds.length === 0) {
        current = [];
        callback([]);
      } else {
        const { data, error } = await supabase
          .from("community_posts")
          .select("*")
          .in("authorId", userIds)
          .order("createdAt", { ascending: false });
        if (error) throw error;
        current = ((data || []) as unknown as SupaPostRow[]).map(
          toFirestoreCommunityPost,
        );
        emitWithProfiles();
      }

      channel = supabase
        .channel("realtime:community_posts:following")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "community_posts" },
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
      if (profileUnsub) profileUnsub();
    };
  }

  static async toggleLike(postId: string): Promise<boolean> {
    if (!supabaseConfig?.isConfigured) return false;
    const { data: s } = await supabase.auth.getSession();
    const userId = s?.session?.user?.id as string | undefined;
    if (!userId) throw new Error("AUTH_REQUIRED");
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
