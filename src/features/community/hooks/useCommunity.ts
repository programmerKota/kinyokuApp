import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@app/contexts/AuthContext";
import { CommunityService } from "@core/services/firestore";
import ProfileCache, {
  type UserProfileLite,
} from "@core/services/profileCache";
import { UserStatsService } from "@core/services/userStatsService";
import type { CommunityPost } from "@project-types";
import { useAuthPrompt } from "@shared/auth/AuthPromptProvider";
import { useBlockedIds } from "@shared/state/blockStore";
import { useFollowingIds } from "@shared/state/followStore";
import { LikeStore } from "@shared/state/likeStore";
import {
  buildReplyCountMapFromPosts,
  normalizeCommunityPosts,
} from "@shared/utils/community";

export type CommunityTab = "all" | "my" | "following";

export interface UseCommunityState {
  posts: CommunityPost[];
  likedPosts: Set<string>;
  followingUsers: Set<string>;
  replyCounts: Map<string, number>;
  userAverageDays: Map<string, number>;
  activeTab: CommunityTab;
  refreshing: boolean;
  showCreateModal: boolean;
  showReplyButtons: Set<string>;
  loadingMore: boolean;
  hasMore: boolean;
}

export interface UseCommunityActions {
  setShowCreateModal: (v: boolean) => void;
  handleRefresh: () => void;
  handleCreatePost: (postData: { content: string }) => Promise<void>;
  handleLike: (postId: string) => Promise<void>;
  handleComment: (postId: string) => void;
  handleReply: (postId: string) => void;
  handleTabPress: (tab: CommunityTab) => void;
  loadMore: () => Promise<void>;
}

export const useCommunity = (): [UseCommunityState, UseCommunityActions] => {
  const { user } = useAuth();
  const { requireAuth } = useAuthPrompt();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<CommunityTab>("all");
  const followingUsers = useFollowingIds();
  const [showReplyButtons, setShowReplyButtons] = useState<Set<string>>(
    new Set(),
  );
  const [replyCounts, setReplyCounts] = useState<Map<string, number>>(
    new Map(),
  );
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set());
  const [userAverageDays, setUserAverageDays] = useState<Map<string, number>>(
    new Map(),
  );
  const [profilesMap, setProfilesMap] = useState<
    Map<string, UserProfileLite | undefined>
  >(new Map());
  const [cursor, setCursor] = useState<unknown>(undefined as unknown);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const blockedSet = useBlockedIds();
  // Guard: ensure initial fetch/subscribe runs once per tab (avoid StrictMode double-invoke)
  const initRunRef = useRef<{ all: boolean; my: boolean; following: boolean }>({
    all: false,
    my: false,
    following: false,
  });

  // Per-tab cache to avoid clearing list when switching tabs
  // following cache also tracks the key of followed user IDs to invalidate when it changes
  const cacheRef = useRef<{
    all?: { posts: CommunityPost[]; cursor?: unknown; hasMore: boolean };
    my?: { posts: CommunityPost[]; uidKey: string };
    following?: { posts: CommunityPost[]; idsKey: string };
  }>({});

  const createPostRequestSeqRef = useRef(0); // Guard to drop stale refresh responses during rapid posts

  // internal helpers
  const initializeLikedPosts = useCallback(
    async (list: CommunityPost[]) => {
      if (!user) return;
      // Check only posts whose like state is unknown, in bulk
      const toCheck = list.map((p) => p.id).filter((id) => !likedPosts.has(id));
      if (toCheck.length === 0) return;
      try {
        const set = await CommunityService.getLikedPostIds(user.uid, toCheck);
        if (set.size === 0) return;
        const next = new Set(likedPosts);
        set.forEach((id) => next.add(id));
        setLikedPosts(next);
      } catch {
        /* ignore */
      }
    },
    [user, likedPosts],
  );

  // Initialize LikeStore from server state once; do not override user taps
  useEffect(() => {
    try {
      posts.forEach((p) => {
        LikeStore.setFromServer(p.id, {
          isLiked: likedPosts.has(p.id),
          likes: p.likes || 0,
        });
      });
    } catch {}
  }, [likedPosts, posts]);

  const initializeUserAverageDays = useCallback(
    async (list: CommunityPost[]) => {
      const next = new Map(userAverageDays);
      const uniqueIds = new Set(list.map((p) => p.authorId));
      const missing = Array.from(uniqueIds).filter((uid) => !next.has(uid));
      if (missing.length === 0) return;
      try {
        const map =
          await UserStatsService.getManyUsersCurrentDaysForRank(missing);
        map.forEach((days, uid) => next.set(uid, Math.max(0, days)));
      } catch {
        const results = await Promise.all(
          missing.map(async (uid) => ({
            uid,
            days: await UserStatsService.getUserCurrentDaysForRank(uid).catch(
              () => 0,
            ),
          })),
        );
        results.forEach(({ uid, days }) => next.set(uid, Math.max(0, days)));
      }
      setUserAverageDays(next);
    },
    [userAverageDays],
  );

  const normalizePosts = useCallback(
    async (list: CommunityPost[]) => {
      const normalized = normalizeCommunityPosts(list);
      // ブロックしたユーザーの投稿を除外
      const filtered = normalized.filter((p) => !blockedSet.has(p.authorId));
      const counts = buildReplyCountMapFromPosts(filtered);
      setReplyCounts(counts);
      // Keep the bubble counter in sync with server-provided `comments`
      // Using `set` to refresh existing values as posts update via Realtime.
      try {
        const { ReplyCountStore } = await import("@shared/state/replyStore");
        filtered.forEach((p) => {
          ReplyCountStore.setFromServer(p.id, p.comments || 0);
        });
        // Also refresh like counters from server snapshot while preserving local isLiked
        const { LikeStore } = await import("@shared/state/likeStore");
        filtered.forEach((p) => {
          const cur = LikeStore.get(p.id) || { isLiked: false, likes: 0 };
          LikeStore.setFromServer(p.id, {
            isLiked: cur.isLiked,
            likes: p.likes || 0,
          });
        });
      } catch {}
      return filtered;
    },
    [blockedSet],
  );

  const mergePostsById = useCallback(
    (prev: CommunityPost[], next: CommunityPost[]): CommunityPost[] => {
      const prevMap = new Map(prev.map((p) => [p.id, p] as const));
      return next.map((n) => {
        const p = prevMap.get(n.id);
        if (
          p &&
          p.authorId === n.authorId &&
          p.authorName === n.authorName &&
          p.authorAvatar === n.authorAvatar &&
          p.content === n.content &&
          p.likes === n.likes &&
          p.comments === n.comments &&
          String(p.createdAt) === String(n.createdAt) &&
          String(p.updatedAt) === String(n.updatedAt)
        ) {
          return p;
        }
        return n;
      });
    },
    [],
  );

  // For pagination: append new page while keeping previous items and avoiding duplicates.
  const appendUniqueById = useCallback(
    (prev: CommunityPost[], next: CommunityPost[]): CommunityPost[] => {
      if (prev.length === 0) return next;
      const indexMap = new Map(prev.map((p, i) => [p.id, i] as const));
      const out = prev.slice();
      for (const n of next) {
        const idx = indexMap.get(n.id);
        if (idx === undefined) {
          out.push(n);
          indexMap.set(n.id, out.length - 1);
        } else {
          const p = out[idx];
          if (
            !(
              p &&
              p.authorId === n.authorId &&
              p.authorName === n.authorName &&
              p.authorAvatar === n.authorAvatar &&
              p.content === n.content &&
              p.likes === n.likes &&
              p.comments === n.comments &&
              String(p.createdAt) === String(n.createdAt) &&
              String(p.updatedAt) === String(n.updatedAt)
            )
          ) {
            out[idx] = n;
          }
        }
      }
      return out;
    },
    [],
  );

  // 初回ロード時の読み込み: all/following はページング対応、my は直接読み込み
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const run = () => {
      switch (activeTab) {
        case "all":
          // キャッシュがあれば即座に表示
          if (cacheRef.current.all?.posts?.length) {
            setPosts(cacheRef.current.all.posts);
            setCursor(cacheRef.current.all.cursor);
            setHasMore(cacheRef.current.all.hasMore);
            return;
          }
          if (initRunRef.current.all) return;
          // まだキャッシュがない場合は初回読み込みのため不要クリア
          setPosts([]);
          setCursor(undefined);
          setHasMore(true);
          setRefreshing(true);
          (async () => {
            try {
              const { items, nextCursor } =
                await CommunityService.getRecentPostsPage(100);
              const normalized = await normalizePosts(items as CommunityPost[]);
              setPosts(normalized);
              setCursor(nextCursor);
              setHasMore(Boolean(nextCursor));
              void initializeLikedPosts(normalized);
              void initializeUserAverageDays(normalized);
              cacheRef.current.all = {
                posts: normalized,
                cursor: nextCursor,
                hasMore: Boolean(nextCursor),
              };
              initRunRef.current.all = true;
            } finally {
              setRefreshing(false);
            }
          })();
          break;
        case "my":
          // Always fetch fresh on tab focus
          setPosts([]);
          setCursor(undefined);
          setHasMore(false);
          if (user) {
            setRefreshing(true);
            (async () => {
              try {
                const list = await CommunityService.getUserPosts(user.uid);
                const normalized = await normalizePosts(
                  list as CommunityPost[],
                );
                setPosts(normalized);
                void initializeLikedPosts(normalized);
                void initializeUserAverageDays(normalized);
                cacheRef.current.my = { posts: normalized, uidKey: user.uid };
              } finally {
                setRefreshing(false);
              }
            })();
          } else {
            setPosts([]);
          }
          break;
        case "following":
          // Keep a live subscription while on the tab; re-init on dependency change.
          setPosts([]);
          setCursor(undefined);
          setHasMore(false);
          if (user && followingUsers.size > 0) {
            setRefreshing(true);
            const ids = Array.from(followingUsers).sort();
            const idsKey = ids.join(",");
            unsubscribe = CommunityService.subscribeToFollowingPosts(
              ids,
              (list: CommunityPost[]) => {
                (async () => {
                  const normalized = await normalizePosts(list);
                  setPosts(normalized);
                  void initializeLikedPosts(normalized);
                  void initializeUserAverageDays(normalized);
                  cacheRef.current.following = { posts: normalized, idsKey };
                  setRefreshing(false);
                })();
              },
            );
          } else {
            setPosts([]);
            setRefreshing(false);
          }
          break;
      }
    };
    run();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeTab, user, followingUsers, normalizePosts, mergePostsById]);

  const loadMore = useCallback(async () => {
    if (activeTab !== "all" || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { items, nextCursor } = await CommunityService.getRecentPostsPage(
        100,
        cursor as { id?: string; createdAt?: string },
      );
      if (items.length === 0) {
        setHasMore(false);
        if (cacheRef.current.all) cacheRef.current.all.hasMore = false;
        return;
      }
      const normalized = await normalizePosts(items as CommunityPost[]);
      setPosts((prev) => {
        const merged = appendUniqueById(prev, normalized);
        cacheRef.current.all = {
          posts: merged,
          cursor: nextCursor,
          hasMore: Boolean(nextCursor),
        };
        return merged;
      });
      setCursor(nextCursor);
      setHasMore(Boolean(nextCursor));
      void initializeLikedPosts(normalized);
      void initializeUserAverageDays(normalized);
    } finally {
      setLoadingMore(false);
    }
  }, [
    activeTab,
    loadingMore,
    hasMore,
    cursor,
    normalizePosts,
    initializeLikedPosts,
    initializeUserAverageDays,
  ]);

  // following user IDs are provided by external store via AuthContext subscription

  // reflect block changes from global store immediately
  useEffect(() => {
    setPosts((prev) => prev.filter((p) => !blockedSet.has(p.authorId)));
  }, [blockedSet]);

  // Prefetch and live-merge author profiles (name/avatar)
  useEffect(() => {
    const ids = Array.from(new Set(posts.map((p) => p.authorId)));
    if (ids.length === 0) {
      setProfilesMap(new Map());
      return;
    }
    const unsub = ProfileCache.getInstance().subscribeMany(ids, (map) => {
      setProfilesMap(map);
    });
    return () => {
      try {
        unsub?.();
      } catch {}
    };
  }, [posts]);

  // Enrich posts with live profile data
  const enrichedPosts = useMemo(() => {
    if (!posts || posts.length === 0) return posts;
    return posts.map((p) => {
      const prof = profilesMap.get(p.authorId);
      if (!prof) return p;
      return {
        ...p,
        authorName: prof.displayName ?? p.authorName,
        authorAvatar: prof.photoURL ?? p.authorAvatar,
      } as CommunityPost;
    });
  }, [posts, profilesMap]);

  // actions
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeTab === "all") {
        const { items, nextCursor } =
          await CommunityService.getRecentPostsPage(100);
        const normalized = await normalizePosts(items as CommunityPost[]);
        setPosts(normalized);
        setCursor(nextCursor);
        setHasMore(Boolean(nextCursor));
        void initializeLikedPosts(normalized);
        void initializeUserAverageDays(normalized);
        cacheRef.current.all = {
          posts: normalized,
          cursor: nextCursor,
          hasMore: Boolean(nextCursor),
        };
        initRunRef.current.all = true;
      } else if (activeTab === "my") {
        if (!user) return;
        const list = await CommunityService.getUserPosts(user.uid);
        const normalized = await normalizePosts(list as CommunityPost[]);
        setPosts(normalized);
        setCursor(undefined);
        setHasMore(false);
        void initializeLikedPosts(normalized);
        void initializeUserAverageDays(normalized);
        cacheRef.current.my = { posts: normalized, uidKey: user.uid };
        initRunRef.current.my = true;
      } else if (activeTab === "following") {
        if (!user || followingUsers.size === 0) {
          setPosts([]);
          setHasMore(false);
        } else {
          const idsKey = Array.from(followingUsers).sort().join(",");
          await new Promise<void>((resolve) => {
            const unsub = CommunityService.subscribeToFollowingPosts(
              Array.from(followingUsers).sort(),
              async (list) => {
                const normalized = await normalizePosts(
                  list as CommunityPost[],
                );
                setPosts(normalized);
                setCursor(undefined);
                setHasMore(false);
                void initializeLikedPosts(normalized);
                void initializeUserAverageDays(normalized);
                cacheRef.current.following = { posts: normalized, idsKey };
                try {
                  unsub();
                } catch {}
                resolve();
              },
            );
          });
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [
    activeTab,
    user,
    followingUsers,
    normalizePosts,
    initializeLikedPosts,
    initializeUserAverageDays,
  ]);

  const handleCreatePost = useCallback(
    async (postData: { content: string }) => {
      const ok = await requireAuth();
      if (!ok) return;
      const requestId = (createPostRequestSeqRef.current += 1);
      await CommunityService.addPost(postData);

      cacheRef.current.all = undefined;
      cacheRef.current.my = undefined;
      initRunRef.current.all = false;
      initRunRef.current.my = false;

      const refreshAll = async () => {
        const { items, nextCursor } =
          await CommunityService.getRecentPostsPage(100);
        const normalized = await normalizePosts(items as CommunityPost[]);
        if (createPostRequestSeqRef.current !== requestId) return;
        setPosts(normalized);
        setCursor(nextCursor);
        setHasMore(Boolean(nextCursor));
        void initializeLikedPosts(normalized);
        void initializeUserAverageDays(normalized);
        cacheRef.current.all = {
          posts: normalized,
          cursor: nextCursor,
          hasMore: Boolean(nextCursor),
        };
        initRunRef.current.all = true;
      };

      const refreshMy = async () => {
        if (!user) return;
        const list = await CommunityService.getUserPosts(user.uid);
        if (!Array.isArray(list)) return;
        const normalized = await normalizePosts(list as CommunityPost[]);
        if (createPostRequestSeqRef.current !== requestId) return;
        setPosts(normalized);
        setCursor(undefined);
        setHasMore(false);
        void initializeLikedPosts(normalized);
        void initializeUserAverageDays(normalized);
        cacheRef.current.my = { posts: normalized, uidKey: user.uid };
        initRunRef.current.my = true;
      };

      if (activeTab === "my") {
        await refreshMy();
        return;
      }

      if (activeTab === "all") {
        await refreshAll();
        return;
      }

      // following tab: rely on live subscription but ensure caches refresh next visit to other tabs
    },
    [
      activeTab,
      user,
      initializeLikedPosts,
      initializeUserAverageDays,
      normalizePosts,
    ],
  );

  const handleLike = useCallback(
    async (postId: string) => {
      const ok = await requireAuth();
      if (!ok) return;
      if (likingIds.has(postId)) return;
      setLikingIds((prev) => new Set(prev).add(postId));
      try {
        // Reconcile optimistic UI with server result
        const prevState = (() => {
          try {
            const mod = require("@shared/state/likeStore") as {
              LikeStore: {
                get: (
                  id: string,
                ) => { isLiked: boolean; likes: number } | undefined;
              };
            };
            return mod.LikeStore.get(postId);
          } catch {
            return undefined;
          }
        })() as { isLiked: boolean; likes: number } | undefined;

        const liked = await CommunityService.toggleLike(postId);

        try {
          const { LikeStore } = require("@shared/state/likeStore");
          const cur = LikeStore.get(postId) ||
            prevState || { isLiked: false, likes: 0 };
          const needsAdjust = cur.isLiked !== liked;
          const nextLikes = needsAdjust
            ? Math.max(0, (cur.likes || 0) + (liked ? 1 : -1))
            : cur.likes;
          LikeStore.set(postId, { isLiked: liked, likes: nextLikes });
        } catch {}
      } catch (e) {
        // Rollback optimistic change on failure
        try {
          const { LikeStore } = require("@shared/state/likeStore");
          const cur = LikeStore.get(postId) || { isLiked: false, likes: 0 };
          LikeStore.set(postId, {
            isLiked: !cur.isLiked,
            likes: Math.max(0, (cur.likes || 0) + (cur.isLiked ? 1 : -1)),
          });
        } catch {}
      } finally {
        setLikingIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      }
    },
    [likingIds, posts],
  );

  const handleComment = useCallback((postId: string) => {
    // Toggle minimal-UI reply visibility only; avoid list-wide re-render
    try {
      const {
        ReplyVisibilityStore,
      } = require("@shared/state/replyVisibilityStore");
      ReplyVisibilityStore.toggle(postId);
    } catch {}
  }, []);

  const handleReply = useCallback((postId: string) => {
    try {
      const {
        ReplyVisibilityStore,
      } = require("@shared/state/replyVisibilityStore");
      ReplyVisibilityStore.set(postId, true);
    } catch {}
  }, []);

  const handleTabPress = useCallback((tab: CommunityTab) => {
    // タブ切替時に返信表示の開閉状態をリセット
    try {
      const {
        ReplyVisibilityStore,
      } = require("@shared/state/replyVisibilityStore");
      ReplyVisibilityStore.clearAll?.();
    } catch {}
    // どのタブでも再入時はキャッシュ/初期化をリセットして再取得させる
    if (tab === "all") {
      cacheRef.current.all = undefined;
      initRunRef.current.all = false;
    } else if (tab === "my") {
      cacheRef.current.my = undefined;
      initRunRef.current.my = false;
    } else if (tab === "following") {
      cacheRef.current.following = undefined;
      initRunRef.current.following = false;
    }
    // likedPosts をクリアしてサーバー確認を強制
    setLikedPosts(new Set());
    setActiveTab(tab);
  }, []);

  const state: UseCommunityState = useMemo(
    () => ({
      posts: enrichedPosts,
      likedPosts,
      followingUsers,
      replyCounts,
      userAverageDays,
      activeTab,
      refreshing,
      showCreateModal,
      showReplyButtons,
      loadingMore,
      hasMore,
    }),
    [
      enrichedPosts,
      likedPosts,
      followingUsers,
      replyCounts,
      userAverageDays,
      activeTab,
      refreshing,
      showCreateModal,
      showReplyButtons,
      loadingMore,
      hasMore,
    ],
  );

  const actions: UseCommunityActions = {
    setShowCreateModal,
    handleRefresh,
    handleCreatePost,
    handleLike,
    handleComment,
    handleReply,
    handleTabPress,
    loadMore,
  };

  return [state, actions];
};

export default useCommunity;
