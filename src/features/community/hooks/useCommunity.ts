import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@app/contexts/AuthContext';
import { CommunityService, FollowService, BlockService } from '@core/services/firestore';
import { UserStatsService } from '@core/services/userStatsService';
import { buildReplyCountMapFromPosts, normalizeCommunityPosts, toggleLikeInList, incrementCountMap } from '@shared/utils/community';
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
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
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

  const initializeUserAverageDays = useCallback(async (list: CommunityPost[]) => {
    const next = new Map(userAverageDays);
    const uniqueIds = new Set(list.map((p) => p.authorId));
    const missing = Array.from(uniqueIds).filter((uid) => !next.has(uid));
    if (missing.length === 0) return;
    for (const uid of missing) {
      const avg = await UserStatsService.getUserCurrentDaysForRank(uid).catch(() => 0);
      next.set(uid, avg);
    }
    setUserAverageDays(next);
  }, [userAverageDays]);

  const normalizePosts = useCallback(async (list: CommunityPost[]) => {
    const normalized = normalizeCommunityPosts(list);
    // ブロックしたユーザーの投稿を除外
    const filtered = normalized.filter((p) => !blockedIds.has(p.authorId));
    const counts = buildReplyCountMapFromPosts(filtered);
    setReplyCounts(counts);
    return filtered;
  }, [blockedIds]);

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

  // 初回ロード/タブ切替: all/following はページング取得、my は購読
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const run = () => {
      switch (activeTab) {
        case 'all':
          // キャッシュがあれば即復元
          if (cacheRef.current.all?.posts?.length) {
            setPosts(cacheRef.current.all.posts);
            setCursor(cacheRef.current.all.cursor);
            setHasMore(cacheRef.current.all.hasMore);
            return;
          }
          if (initRunRef.current.all) return;
          // まだキャッシュがない初回は即時切替のため一旦クリア
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
          // キャッシュがあれば即復元
          if (cacheRef.current.my?.posts?.length) {
            setPosts(cacheRef.current.my.posts);
            setCursor(undefined);
            setHasMore(true);
            return;
          }
          if (initRunRef.current.my) return;
          // まだキャッシュがない初回は即時切替のため一旦クリア
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
          // キャッシュがあれば即復元
          if (cacheRef.current.following?.posts?.length) {
            setPosts(cacheRef.current.following.posts);
            setCursor(undefined);
            setHasMore(true);
            return;
          }
          if (initRunRef.current.following) return;
          // まだキャッシュがない初回は即時切替のため一旦クリア
          setPosts([]);
          setCursor(undefined);
          setHasMore(true);
          // フォロー一覧は、IDが取得できてから購読開始する。未取得時は空表示にする。
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
            // ユーザー未ログイン、または followingUsers 未取得時は空にする
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

  // subscribe blocked user ids to filter posts
  useEffect(() => {
    if (!user) return;
    const unsub = BlockService.subscribeBlockedIds(user.uid, (ids: string[]) => {
      setBlockedIds(new Set(ids));
      // 既存の一覧からも即時除外
      setPosts((prev) => prev.filter((p) => !ids.includes(p.authorId)));
    });
    return unsub;
  }, [user]);

  // actions
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

  const handleCreatePost = useCallback(
    async (postData: { content: string }) => {
      await CommunityService.addPost(postData);
      if (user) {
        const list = await CommunityService.getUserPosts(user.uid);
        if (Array.isArray(list)) {
          const normalized = await normalizePosts(list as CommunityPost[]);
          setPosts((prev) => mergePostsById(prev, normalized));
        }
      }
    },
    [user, normalizePosts, mergePostsById],
  );

  const handleLike = useCallback(async (postId: string) => {
    if (likingIds.has(postId)) return;
    setLikingIds((prev) => new Set(prev).add(postId));
    try {
      const isLiked = await CommunityService.toggleLike(postId);
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      // Targeted update: adjust only the liked post's count in local list
      setPosts((prev) => {
        const updated = toggleLikeInList(prev, postId, isLiked);
        // Keep cache in sync for the active tab
        if (activeTab === 'all' && cacheRef.current.all) {
          cacheRef.current.all.posts = updated;
        } else if (activeTab === 'my' && cacheRef.current.my) {
          cacheRef.current.my.posts = updated;
        } else if (activeTab === 'following' && cacheRef.current.following) {
          cacheRef.current.following.posts = updated;
        }
        return updated;
      });
    } finally {
      setLikingIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  }, [likingIds, activeTab]);

  const handleComment = useCallback((postId: string) => {
    setShowReplyButtons((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }, []);

  const handleReply = useCallback((postId: string) => {
    setReplyingTo(postId);
    setReplyText('');
  }, []);

  const handleReplySubmit = useCallback(async () => {
    if (!replyingTo || !replyText.trim()) return;
    await CommunityService.addReply(replyingTo, { content: replyText.trim() });
    setReplyCounts((prev) => incrementCountMap(prev, replyingTo, 1));
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
