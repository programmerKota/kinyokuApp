import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@app/contexts/AuthContext';
import { CommunityService, FollowService, BlockService } from '@core/services/firestore';
import { UserStatsService } from '@core/services/userStatsService';
import { buildReplyCountMapFromPosts, normalizeCommunityPosts, toggleLikeInList, incrementCountMap } from '@shared/utils/community';
import { useBlockedIds } from '@shared/state/blockStore';
import { LikeStore } from '@shared/state/likeStore';
import type { CommunityPost } from '@project-types';

export type CommunityTab = 'all' | 'my' | 'following';

export interface UseCommunityState {
  posts: CommunityPost[];
  likedPosts: Set<string>;
  followingUsers: Set<string>;
  replyCounts: Map<string, number>;
  userAverageDays: Map<string, number>;
  activeTab: CommunityTab;
  refreshing: boolean;
  showCreateModal: boolean;
  replyingTo: string | null;
  replyText: string;
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
  handleReplySubmit: () => Promise<void>;
  handleReplyCancel: () => void;
  handleTabPress: (tab: CommunityTab) => void;
  setReplyText: (v: string) => void;
  loadMore: () => Promise<void>;
}

export const useCommunity = (): [UseCommunityState, UseCommunityActions] => {
  const { user } = useAuth();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<CommunityTab>('all');
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showReplyButtons, setShowReplyButtons] = useState<Set<string>>(new Set());
  const [replyCounts, setReplyCounts] = useState<Map<string, number>>(new Map());
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set());
  const [userAverageDays, setUserAverageDays] = useState<Map<string, number>>(new Map());
  const [cursor, setCursor] = useState<unknown | undefined>(undefined);
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
  const cacheRef = useRef<{
    all?: { posts: CommunityPost[]; cursor?: unknown; hasMore: boolean };
    my?: { posts: CommunityPost[] };
    following?: { posts: CommunityPost[] };
  }>({});

  const createPostRequestSeqRef = useRef(0); // Guard to drop stale refresh responses during rapid posts

  // internal helpers
  const initializeLikedPosts = useCallback(
    async (list: CommunityPost[]) => {
      if (!user) return;
      // Check only posts whose like state is unknown
      const toCheck = list.map((p) => p.id).filter((id) => !likedPosts.has(id));
      if (toCheck.length === 0) return;
      const next = new Set(likedPosts);
      for (const id of toCheck) {
        const isLiked = await CommunityService.isPostLikedByUser(id, user.uid).catch(() => false);
        if (isLiked) next.add(id);
      }
      setLikedPosts(next);
    },
    [user, likedPosts],
  );

  // Initialize LikeStore from server state once; do not override user taps
  useEffect(() => {
    try {
      posts.forEach((p) => {
        LikeStore.setFromServer(p.id, { isLiked: likedPosts.has(p.id), likes: p.likes || 0 });
      });
    } catch {}
  }, [likedPosts, posts]);

  const initializeUserAverageDays = useCallback(async (list: CommunityPost[]) => {
    const next = new Map(userAverageDays);
    const uniqueIds = new Set(list.map((p) => p.authorId));
    const missing = Array.from(uniqueIds).filter((uid) => !next.has(uid));
    if (missing.length === 0) return;
    for (const uid of missing) {
      const days = await UserStatsService.getUserCurrentDaysForRank(uid).catch(() => 0);
      next.set(uid, Math.max(0, days));
    }
    setUserAverageDays(next);
  }, [userAverageDays]);

  const normalizePosts = useCallback(async (list: CommunityPost[]) => {
    const normalized = normalizeCommunityPosts(list);
    // 繝悶Ο繝・け縺励◆繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ謚慕ｨｿ繧帝勁螟・
    const filtered = normalized.filter((p) => !blockedSet.has(p.authorId));
    const counts = buildReplyCountMapFromPosts(filtered);
    setReplyCounts(counts);
    // Initialize per-post reply counters store for minimal UI updates
    try {
      const { ReplyCountStore } = await import('@shared/state/replyStore');
      filtered.forEach((p) => ReplyCountStore.init(p.id, p.comments || 0));
    } catch {}
    return filtered;
  }, [blockedSet]);

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
            !(p &&
              p.authorId === n.authorId &&
              p.authorName === n.authorName &&
              p.authorAvatar === n.authorAvatar &&
              p.content === n.content &&
              p.likes === n.likes &&
              p.comments === n.comments &&
              String(p.createdAt) === String(n.createdAt) &&
              String(p.updatedAt) === String(n.updatedAt))
          ) {
            out[idx] = n;
          }
        }
      }
      return out;
    },
    [],
  );

  // 蛻晏屓繝ｭ繝ｼ繝・繧ｿ繝門・譖ｿ: all/following 縺ｯ繝壹・繧ｸ繝ｳ繧ｰ蜿門ｾ励［y 縺ｯ雉ｼ隱ｭ
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const run = () => {
      switch (activeTab) {
        case 'all':
          // 繧ｭ繝｣繝・す繝･縺後≠繧後・蜊ｳ蠕ｩ蜈・
          if (cacheRef.current.all?.posts?.length) {
            setPosts(cacheRef.current.all.posts);
            setCursor(cacheRef.current.all.cursor);
            setHasMore(cacheRef.current.all.hasMore);
            return;
          }
          if (initRunRef.current.all) return;
          // 縺ｾ縺繧ｭ繝｣繝・す繝･縺後↑縺・・蝗槭・蜊ｳ譎ょ・譖ｿ縺ｮ縺溘ａ荳譌ｦ繧ｯ繝ｪ繧｢
          setPosts([]);
          setCursor(undefined);
          setHasMore(true);
          (async () => {
            const { items, nextCursor } = await CommunityService.getRecentPostsPage(100);
            const normalized = await normalizePosts(items as CommunityPost[]);
            setPosts(normalized);
            setCursor(nextCursor);
            setHasMore(Boolean(nextCursor));
            void initializeLikedPosts(normalized);
            void initializeUserAverageDays(normalized);
            cacheRef.current.all = { posts: normalized, cursor: nextCursor, hasMore: Boolean(nextCursor) };
            initRunRef.current.all = true;
          })();
          break;
        case 'my':
          // 繧ｭ繝｣繝・す繝･縺後≠繧後・蜊ｳ蠕ｩ蜈・
          if (cacheRef.current.my?.posts?.length) {
            setPosts(cacheRef.current.my.posts);
            setCursor(undefined);
            setHasMore(true);
            return;
          }
          if (initRunRef.current.my) return;
          // 縺ｾ縺繧ｭ繝｣繝・す繝･縺後↑縺・・蝗槭・蜊ｳ譎ょ・譖ｿ縺ｮ縺溘ａ荳譌ｦ繧ｯ繝ｪ繧｢
          setPosts([]);
          setCursor(undefined);
          setHasMore(true);
          if (user) {
            (async () => {
              const list = await CommunityService.getUserPosts(user.uid);
              const normalized = await normalizePosts(list as CommunityPost[]);
              setPosts(normalized);
              void initializeLikedPosts(normalized);
              void initializeUserAverageDays(normalized);
              cacheRef.current.my = { posts: normalized };
              initRunRef.current.my = true;
            })();
          } else {
            setPosts([]);
          }
          break;
        case 'following':
          // 繧ｭ繝｣繝・す繝･縺後≠繧後・蜊ｳ蠕ｩ蜈・
          if (cacheRef.current.following?.posts?.length) {
            setPosts(cacheRef.current.following.posts);
            setCursor(undefined);
            setHasMore(true);
            return;
          }
          if (initRunRef.current.following) return;
          // 縺ｾ縺繧ｭ繝｣繝・す繝･縺後↑縺・・蝗槭・蜊ｳ譎ょ・譖ｿ縺ｮ縺溘ａ荳譌ｦ繧ｯ繝ｪ繧｢
          setPosts([]);
          setCursor(undefined);
          setHasMore(true);
          // 繝輔か繝ｭ繝ｼ荳隕ｧ縺ｯ縲！D縺悟叙蠕励〒縺阪※縺九ｉ雉ｼ隱ｭ髢句ｧ九☆繧九よ悴蜿門ｾ玲凾縺ｯ遨ｺ陦ｨ遉ｺ縺ｫ縺吶ｋ縲・
          if (user && followingUsers.size > 0) {
            unsubscribe = CommunityService.subscribeToFollowingPosts(
              Array.from(followingUsers),
              (list: CommunityPost[]) => {
                void (async () => {
                  const normalized = await normalizePosts(list);
                  setPosts((prev) => mergePostsById(prev, normalized));
                  void initializeLikedPosts(normalized);
                  void initializeUserAverageDays(normalized);
                  cacheRef.current.following = { posts: normalized };
                })();
              },
            );
            initRunRef.current.following = true;
          } else {
            // 繝ｦ繝ｼ繧ｶ繝ｼ譛ｪ繝ｭ繧ｰ繧､繝ｳ縲√∪縺溘・ followingUsers 譛ｪ蜿門ｾ玲凾縺ｯ遨ｺ縺ｫ縺吶ｋ
            setPosts([]);
          }
          break;
      }
    };
    run();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [
    activeTab,
    user,
    followingUsers,
    normalizePosts,
    mergePostsById,
  ]);

  const loadMore = useCallback(async () => {
    if (activeTab !== 'all' || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { items, nextCursor } = await CommunityService.getRecentPostsPage(100, cursor as any);
      if (items.length === 0) {
        setHasMore(false);
        if (cacheRef.current.all) cacheRef.current.all.hasMore = false;
        return;
      }
      const normalized = await normalizePosts(items as CommunityPost[]);
      setPosts((prev) => {
        const merged = appendUniqueById(prev, normalized);
        cacheRef.current.all = { posts: merged, cursor: nextCursor, hasMore: Boolean(nextCursor) };
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

  // subscribe following ids
  useEffect(() => {
    if (!user) return;
    const unsub = FollowService.subscribeToFollowingUserIds(user.uid, (ids: string[]) => {
      setFollowingUsers(new Set(ids));
    });
    return unsub;
  }, [user]);

  // reflect block changes from global store immediately
  useEffect(() => {
    setPosts((prev) => prev.filter((p) => !blockedSet.has(p.authorId)));
  }, [blockedSet]);

  // actions
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

  const handleCreatePost = useCallback(
    async (postData: { content: string }) => {
      const requestId = (createPostRequestSeqRef.current += 1);
      await CommunityService.addPost(postData);

      cacheRef.current.all = undefined;
      cacheRef.current.my = undefined;
      initRunRef.current.all = false;
      initRunRef.current.my = false;

      const refreshAll = async () => {
        const { items, nextCursor } = await CommunityService.getRecentPostsPage(100);
        const normalized = await normalizePosts(items as CommunityPost[]);
        if (createPostRequestSeqRef.current !== requestId) return;
        setPosts(normalized);
        setCursor(nextCursor);
        setHasMore(Boolean(nextCursor));
        void initializeLikedPosts(normalized);
        void initializeUserAverageDays(normalized);
        cacheRef.current.all = { posts: normalized, cursor: nextCursor, hasMore: Boolean(nextCursor) };
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
        setHasMore(true);
        void initializeLikedPosts(normalized);
        void initializeUserAverageDays(normalized);
        cacheRef.current.my = { posts: normalized };
        initRunRef.current.my = true;
      };

      if (activeTab === 'my') {
        await refreshMy();
        return;
      }

      if (activeTab === 'all') {
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

  const handleLike = useCallback(async (postId: string) => {
    if (likingIds.has(postId)) return;
    setLikingIds((prev) => new Set(prev).add(postId));
    try {
      // Perform server toggle only; UI was updated optimistically.
      await CommunityService.toggleLike(postId);
    } finally {
      setLikingIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  }, [likingIds, posts]);

  const handleComment = useCallback((postId: string) => {
    // Toggle minimal-UI reply visibility only; avoid list-wide re-render
    try {
      const { ReplyVisibilityStore } = require('@shared/state/replyVisibilityStore');
      ReplyVisibilityStore.toggle(postId);
    } catch {}
  }, []);

  const handleReply = useCallback((postId: string) => {
    setReplyingTo(postId);
    setReplyText('');
  }, []);

  const handleReplySubmit = useCallback(async () => {
    if (!replyingTo || !replyText.trim()) return;
    await CommunityService.addReply(replyingTo, { content: replyText.trim() });
    setReplyCounts((prev) => incrementCountMap(prev, replyingTo, 1));
    // Update only the counter for this post (bubble)
    try {
      const { ReplyCountStore } = await import('@shared/state/replyStore');
      ReplyCountStore.increment(replyingTo, 1);
    } catch {}
    setReplyingTo(null);
    setReplyText('');
  }, [replyText, replyingTo]);

  const handleReplyCancel = useCallback(() => {
    setReplyingTo(null);
    setReplyText('');
  }, []);

  const handleTabPress = useCallback((tab: CommunityTab) => {
    setActiveTab(tab);
  }, []);

  const state: UseCommunityState = useMemo(
    () => ({
      posts,
      likedPosts,
      followingUsers,
      replyCounts,
      userAverageDays,
      activeTab,
      refreshing,
      showCreateModal,
      replyingTo,
      replyText,
      showReplyButtons,
      loadingMore,
      hasMore,
    }),
    [
      posts,
      likedPosts,
      followingUsers,
      replyCounts,
      userAverageDays,
      activeTab,
      refreshing,
      showCreateModal,
      replyingTo,
      replyText,
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
    handleReplySubmit,
    handleReplyCancel,
    handleTabPress,
    setReplyText,
    loadMore,
  };

  return [state, actions];
};

export default useCommunity;

