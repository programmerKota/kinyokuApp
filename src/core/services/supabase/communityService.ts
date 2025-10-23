type Unsubscribe = () => void;
import { supabase, supabaseConfig } from "@app/config/supabase.config";
import type { CommunityComment } from "@project-types";

import type { FirestoreCommunityPost } from "../firestore/types";
import ProfileCache from "../profileCache";
import { withRetry } from "@shared/utils/net";
import { Logger } from "@shared/utils/logger";

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
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  } as FirestoreCommunityPost;
};

export class CommunityService {
  static async getLikedPostIds(
    userId: string,
    postIds: string[],
  ): Promise<Set<string>> {
    if (!supabaseConfig?.isConfigured || postIds.length === 0) return new Set();
    const unique = Array.from(new Set(postIds));
    const { data, error } = await supabase
      .from("community_likes")
      .select("postId")
      .eq("userId", userId)
      .in("postId", unique);
    if (error) throw error;
    const set = new Set<string>();
    (data || []).forEach((row: { postId: string }) => set.add(String(row.postId)));
    return set;
  }
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
  ): Promise<{
    items: FirestoreCommunityPost[];
    nextCursor?: { id: string; createdAt: string } | undefined;
  }> {
    if (!supabaseConfig?.isConfigured)
      return { items: [], nextCursor: undefined };
    let query = supabase
      .from("community_posts_v")
      .select("*")
      .order("createdAt", { ascending: false })
      .limit(pageSize);

    if (after?.createdAt) {
      query = query.lt("createdAt", after.createdAt);
    }

    const result = (await withRetry(async () => await query, {
      retries: 2,
      delayMs: 400,
    })) as { data: unknown[]; error: unknown };
    if (result.error) throw (result.error as Error);
    const rows = (result.data || []) as SupaPostRow[];
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
    const result = (await withRetry(
      async () =>
        await supabase
          .from("community_posts_v")
          .select("*")
          .eq("authorId", userId)
          .order("createdAt", { ascending: false }),
      { retries: 2, delayMs: 400 },
    )) as { data: unknown[]; error: unknown };
    if (result.error) throw (result.error as Error);
    return ((result.data || []) as SupaPostRow[]).map(
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
        const raw = prof?.displayName as string | undefined;
        // Never persist an email-like value as authorName; let view fall back to profiles or 'ユーザー'
        authorName =
          raw && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(raw) ? null : (raw ?? null);
        authorAvatar = prof?.photoURL ?? null;
      }
    } catch (e) {
      Logger.warn("CommunityService.addReply.profile", e, { authorId });
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
    try {
      // Local nudge so UI refreshes instantly even if Realtime is delayed
      const { ReplyEventBus } = await import("@shared/state/replyEventBus");
      ReplyEventBus.emit(postId);
    } catch {}
    return inserted.id as string;
  }

  static async deleteReply(replyId: string, postId: string): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;
    const { error } = await supabase
      .from("community_comments")
      .delete()
      .eq("id", replyId);
    if (error) throw error;
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

  // DB トリガーで community_posts.comments は更新されるため、
  // 手動インクリメントは不要（重複更新を防止）

  static async getPostReplies(postId: string): Promise<CommunityComment[]> {
    if (!supabaseConfig?.isConfigured) return [];
    const { data, error } = await supabase
      .from("community_comments_v")
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
        callback(merged);
      });
    };

    const applyChange = (
      type: "INSERT" | "UPDATE" | "DELETE",
      row: Record<string, unknown>,
    ) => {
      if (!row) return;
      if (type === "INSERT") {
        if ((row as { postId?: string }).postId !== postId) return;
        current = [...current, (row as unknown as CommunityComment)].sort((a, b) =>
          String(a.createdAt).localeCompare(String(b.createdAt)),
        );
      } else if (type === "UPDATE") {
        const idx = current.findIndex((r) => r.id === row.id);
        if (idx >= 0) {
          const copy = [...current];
          copy[idx] = { ...copy[idx], ...(row as unknown as CommunityComment) };
          current = copy;
        } else if ((row as { postId?: string }).postId === postId) {
          current = [...current, (row as unknown as CommunityComment)].sort((a, b) =>
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
            event: "INSERT",
            schema: "public",
            table: "community_comments",
            filter: `postId=eq.${postId}`,
          },
          (payload: { new?: unknown; old?: unknown }) => {
            const row = payload.new || undefined;
            if (!row) return;
            if ((row as { postId: string }).postId !== postId) return;
            applyChange("INSERT", row as Record<string, unknown>);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "community_comments",
            filter: `postId=eq.${postId}`,
          },
          (payload: { new?: unknown; old?: unknown }) => {
            const row = payload.new || undefined;
            if (!row) return;
            if ((row as { postId: string }).postId !== postId) return;
            applyChange("UPDATE", row as Record<string, unknown>);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "community_comments",
            filter: `postId=eq.${postId}`,
          },
          (payload: { new?: unknown; old?: unknown }) => {
            const row = payload.old || undefined;
            if (!row) return;
            if ((row as { postId: string }).postId !== postId) return;
            applyChange("DELETE", row as Record<string, unknown>);
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
      // Emit immediately with current post snapshot so UI doesn't wait for profile fetches
      try {
        callback([...current]);
      } catch {}
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

    const applyChange = (
      type: "INSERT" | "UPDATE" | "DELETE",
      row: Record<string, unknown>,
    ) => {
      if (!row) return;
      if (type === "INSERT") {
        const post = toFirestoreCommunityPost(row as SupaPostRow);
        current = [post, ...current]
          .sort((a, b) =>
            String(b.createdAt).localeCompare(String(a.createdAt)),
          )
          .slice(0, max);
      } else if (type === "UPDATE") {
        const idx = current.findIndex((p) => p.id === row.id);
        const nextPost = toFirestoreCommunityPost(row as SupaPostRow);
        if (idx >= 0) {
          const copy = [...current];
          copy[idx] = { ...copy[idx], ...nextPost } as FirestoreCommunityPost;
          current = copy
            .sort((a, b) =>
              String(b.createdAt).localeCompare(String(a.createdAt)),
            )
            .slice(0, max);
        } else {
          current = [nextPost, ...current]
            .sort((a, b) =>
              String(b.createdAt).localeCompare(String(a.createdAt)),
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
        .from("community_posts_v")
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
          { event: "INSERT", schema: "public", table: "community_posts" },
          (payload: { new?: unknown; old?: unknown }) => {
            const row = payload.new || undefined;
            if (!row) return;
            applyChange("INSERT", row as Record<string, unknown>);
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "community_posts" },
          (payload: { new?: unknown; old?: unknown }) => {
            const row = payload.new || undefined;
            if (!row) return;
            applyChange("UPDATE", row as Record<string, unknown>);
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
      // Emit immediately so UI doesn't block on profiles fetch
      try {
        callback([...current]);
      } catch {}
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

    const applyChange = (
      type: "INSERT" | "UPDATE" | "DELETE",
      row: Record<string, unknown>,
    ) => {
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
          String(b.createdAt).localeCompare(String(a.createdAt)),
        );
      } else if (type === "UPDATE") {
        const idx = current.findIndex((p) => p.id === row.id);
        if (idx >= 0) {
          const copy = [...current];
          copy[idx] = { ...copy[idx], ...post } as FirestoreCommunityPost;
          current = copy.sort((a, b) =>
            String(b.createdAt).localeCompare(String(a.createdAt)),
          );
        } else {
          current = [post, ...current].sort((a, b) =>
            String(b.createdAt).localeCompare(String(a.createdAt)),
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
          {
            event: "INSERT",
            schema: "public",
            table: "community_posts",
            filter: `authorId=eq.${userId}`,
          },
           (payload: { new?: unknown }) => {
             const row = payload.new || undefined;
             if (!row) return;
             applyChange("INSERT", row as Record<string, unknown>);
           },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "community_posts",
            filter: `authorId=eq.${userId}`,
          },
           (payload: { new?: unknown }) => {
             const row = payload.new || undefined;
             if (!row) return;
             applyChange("UPDATE", row as Record<string, unknown>);
           },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "community_posts",
            filter: `authorId=eq.${userId}`,
          },
           (payload: { old?: unknown }) => {
             const row = payload.old || undefined;
             if (!row) return;
             applyChange("DELETE", row as Record<string, unknown>);
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

    const inFollowings = (row: Record<string, any>) =>
      userIds && userIds.length > 0 && typeof row.authorId === "string" && userIds.includes(row.authorId as string);

    const applyChange = (
      type: "INSERT" | "UPDATE" | "DELETE",
      row: Record<string, any>,
    ) => {
      if (!row) return;
      if (type === "INSERT") {
        if (!inFollowings(row)) return;
        const post = toFirestoreCommunityPost(row as SupaPostRow);
        current = [post, ...current].sort((a, b) =>
          String(b.createdAt).localeCompare(String(a.createdAt)),
        );
      } else if (type === "UPDATE") {
        const exists = current.some((p) => p.id === row.id);
        const shouldHave = inFollowings(row);
        if (!exists && shouldHave) {
          const post = toFirestoreCommunityPost(row as SupaPostRow);
          current = [post, ...current].sort((a, b) =>
            String(b.createdAt).localeCompare(String(a.createdAt)),
          );
        } else if (exists && !shouldHave) {
          current = current.filter((p) => p.id !== row.id);
        } else if (exists && shouldHave) {
          const post = toFirestoreCommunityPost(row as SupaPostRow);
          const idx = current.findIndex((p) => p.id === row.id);
          const copy = [...current];
          copy[idx] = { ...copy[idx], ...post } as FirestoreCommunityPost;
          current = copy.sort((a, b) =>
            String(b.createdAt).localeCompare(String(a.createdAt)),
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
          .from("community_posts_v")
          .select("*")
          .in("authorId", userIds)
          .order("createdAt", { ascending: false });
        if (error) throw error;
        current = ((data || []) as unknown as SupaPostRow[]).map(
          toFirestoreCommunityPost,
        );
        emitWithProfiles();
      }

      const filterStr =
        userIds && userIds.length > 0
          ? `authorId=in.(${userIds.map((id) => `"${id}"`).join(",")})`
          : undefined;
      channel = supabase
        .channel("realtime:community_posts:following")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "community_posts",
            ...(filterStr ? { filter: filterStr } : {}),
          },
          (payload: { eventType: string; new?: unknown; old?: unknown }) => {
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
      return false;
    }

    const { error } = await supabase
      .from("community_likes")
      .insert({ id: likeId, userId, postId });
    if (error) throw error;
    return true;
  }

  // DB トリガーで community_posts.likes は更新されるため、
  // 手動インクリメントは不要（重複更新を防止）

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
