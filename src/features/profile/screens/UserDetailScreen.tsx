import { Ionicons } from "@expo/vector-icons";
import type { RouteProp } from "@react-navigation/native";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@app/contexts/AuthContext";
import {
  CommunityService,
  FollowService,
  BlockService,
} from "@core/services/firestore";
import type { FirestoreCommunityPost } from "@core/services/firestore";
import { UserStatsService } from "@core/services/userStatsService";
import PostList from "@features/community/components/PostList";
import ReplyInputBar from "@shared/components/ReplyInputBar";
import KeyboardAwareScrollView from "@shared/components/KeyboardAwareScrollView";
import AvatarImage from "@shared/components/AvatarImage";
import { getRankDisplayByDays } from "@core/services/rankService";
import { useDisplayProfile } from "@shared/hooks/useDisplayProfile";
import { BlockStore } from "@shared/state/blockStore";
import { FollowStore } from "@shared/state/followStore";
import {
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
} from "@shared/theme";
import AppStatusBar from "@shared/theme/AppStatusBar";
import { createUiStyles } from "@shared/ui/styles";
import {
  buildReplyCountMapFromPosts,
  normalizeCommunityPostsFirestore,
  incrementCountMap,
} from "@shared/utils/community";
import { navigateToUserDetail } from "@shared/utils/navigation";
import { useAuthPrompt } from "@shared/auth/AuthPromptProvider";

type RootStackParamList = {
  UserDetail: { userId: string; userName?: string; userAvatar?: string };
};

type UserDetailRouteProp = RouteProp<RootStackParamList, "UserDetail">;

const UserDetailScreen: React.FC = () => {
  const route = useRoute<UserDetailRouteProp>();
  const navigation = useNavigation();
  const { userId, userName, userAvatar } = route.params || ({} as any);
  const { user } = useAuth();
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = React.useMemo(() => colorSchemes[mode], [mode]);
  const uiStyles = useThemedStyles(createUiStyles);
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { name: liveName, avatar: liveAvatar } = useDisplayProfile(
    userId,
    userName,
    userAvatar,
  );
  const [name, setName] = useState<string>(liveName || "ユーザー");
  const [avatar, setAvatar] = useState<string | undefined>(liveAvatar);
  const [following, setFollowing] = useState<boolean>(false);
  const [postsData, setPostsData] = useState<FirestoreCommunityPost[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [blocked, setBlocked] = useState<boolean>(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [showReplyButtons, setShowReplyButtons] = useState<Set<string>>(
    new Set(),
  );
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyCounts, setReplyCounts] = useState<Map<string, number>>(
    new Map(),
  );
  const [averageDays, setAverageDays] = useState(0);
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set());
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const { requireAuth } = useAuthPrompt();
  // 相対時間表示は各セル内の RelativeTime コンポーネントで個別に更新
  // 相対時間更新は各セル側で行うため、画面全体の毎秒再レンダは不要

  // Recompute rank on focus to keep consistency with post lists
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const days = await UserStatsService.getUserCurrentDaysForRank(userId);
          if (mounted) setAverageDays(days);
        } catch {}
        try {
          const c = await FollowService.getCounts(userId);
          if (mounted) {
            setFollowingCount(c.following);
            setFollowersCount(c.followers);
          }
        } catch {}
      })();
      return () => {
        mounted = false;
      };
    }, [userId]),
  );

  useEffect(() => {
    setName(liveName || "ユーザー");
    setAvatar(liveAvatar);
    if (!userId) return;
    (async () => {
      const days = await UserStatsService.getUserCurrentDaysForRank(
        userId,
      ).catch(() => 0);
      setAverageDays(days);
    })();
  }, [userId, liveName, liveAvatar]);

  // Fallback: if profile avatar is missing, borrow latest from posts snapshot
  useEffect(() => {
    if (!avatar) {
      const a = postsData.find((p) => p.authorAvatar)?.authorAvatar;
      if (a) setAvatar(a);
    }
  }, [postsData, avatar]);

  // Initialize LikeStore from server state once; do not override user taps
  useEffect(() => {
    let timer: any | undefined;
    (async () => {
      try {
        const { LikeStore } = await import("@shared/state/likeStore");
        // 16ms 以内に来た更新をまとめて反映
        const apply = () => {
          postsData.forEach((p) => {
            LikeStore.setFromServer(p.id, {
              isLiked: likedPosts.has(p.id),
              likes: p.likes || 0,
            });
          });
          timer = undefined;
        };
        if (!timer) timer = setTimeout(apply, 16);
      } catch {}
    })();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [likedPosts, postsData]);
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    (async () => {
      try {
        const isFollowing = await FollowService.isFollowing(userId);
        if (mounted) setFollowing(isFollowing);
      } catch {}

      try {
        const isBlocked = await BlockService.isBlocked(userId);
        if (mounted) setBlocked(isBlocked);
      } catch {}

      try {
        const c = await FollowService.getCounts(userId);
        if (mounted) {
          setFollowingCount(c.following);
          setFollowersCount(c.followers);
        }
      } catch {}

      try {
        unsubscribe = CommunityService.subscribeToUserPosts(
          userId,
          async (list) => {
            const normalized = normalizeCommunityPostsFirestore(list);

            // 返信の取得はトークアイコン押下時に行うため、
            // ここでは Firestore から返信一覧を取得しない。
            // 表示用の件数は投稿の `comments` を利用する。
            const counts = buildReplyCountMapFromPosts(normalized);

            setReplyCounts(counts);
            setPostsData(normalized);

            if (user) {
              try {
                const ids = normalized.map((p) => p.id);
                const set = await CommunityService.getLikedPostIds(
                  user.uid,
                  ids,
                );
                setLikedPosts(set);
              } catch {}
            }
          },
        );
      } catch {}
    })();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [userId, user]);

  const handlePostPress = (post: FirestoreCommunityPost) => {
    navigateToUserDetail(
      navigation,
      post.authorId,
      post.authorName,
      post.authorAvatar,
    );
  };

  const handleLike = async (postId: string) => {
    const ok = await requireAuth();
    if (!ok) return;
    if (likingIds.has(postId)) return;
    setLikingIds((prev) => new Set(prev).add(postId));
    try {
      // 現在の LikeStore 状態を基準に、サーバー結果と整合させる
      let prevState: { isLiked: boolean; likes: number } | undefined;
      try {
        const { LikeStore } = require("@shared/state/likeStore");
        prevState = LikeStore.get(postId) || undefined;
        // 楽観的にUIを先に反映（Community画面と同様）
        const cur =
          prevState ||
          ({
            isLiked: likedPosts.has(postId),
            likes: postsData.find((p) => p.id === postId)?.likes || 0,
          } as any);
        const nextIsLiked = !cur.isLiked;
        const nextLikes = Math.max(
          0,
          (cur.likes || 0) + (nextIsLiked ? 1 : -1),
        );
        LikeStore.set(postId, { isLiked: nextIsLiked, likes: nextLikes });
      } catch {
        /* ignore */
      }

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
      } catch {
        /* ignore */
      }
    } catch (e) {
      console.warn("like toggle failed", e);
      // 失敗時は可能ならロールバック
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
        const s = new Set(prev);
        s.delete(postId);
        return s;
      });
    }
  };

  const handleComment = (postId: string) => {
    try {
      const {
        ReplyVisibilityStore,
      } = require("@shared/state/replyVisibilityStore");
      ReplyVisibilityStore.toggle(postId);
    } catch {}
  };

  const handleReply = async (postId: string) => {
    const ok = await requireAuth();
    if (!ok) return;
    setReplyingTo(postId);
    setReplyText("");
  };

  const handleReplySubmit = async () => {
    if (!replyingTo || !replyText.trim()) return;
    const ok = await requireAuth();
    if (!ok) return;
    try {
      await CommunityService.addReply(replyingTo, {
        content: replyText.trim(),
      });
      setReplyCounts((prev) => incrementCountMap(prev, replyingTo, 1));
      // Update minimal UI: just the bubble count for this post
      try {
        const { ReplyCountStore } = await import("@shared/state/replyStore");
        ReplyCountStore.increment(replyingTo, 1);
      } catch {}
      setReplyingTo(null);
      setReplyText("");
    } catch (e) {
      console.warn("reply failed", e);
    }
  };

  const handleReplyCancel = () => {
    setReplyingTo(null);
    setReplyText("");
  };

  // PostList が各種描画を担当

  const onToggleFollow = async () => {
    try {
      const ok = await requireAuth();
      if (!ok) return;
      if (following) {
        // Optimistic update
        FollowStore.remove(userId);
        await FollowService.unfollow(userId);
        setFollowing(false);
        setFollowersCount((n) => Math.max(0, n - 1));
      } else {
        // Optimistic update
        FollowStore.add(userId);
        await FollowService.follow(userId);
        setFollowing(true);
        setFollowersCount((n) => n + 1);
      }
    } catch (e) {
      console.warn("follow toggle failed", e);
    }
  };

  const onToggleBlock = async () => {
    try {
      const ok = await requireAuth();
      if (!ok) return;
      const wasFollowing = following;
      if (blocked) {
        // Optimistic
        BlockStore.remove(userId);
        await BlockService.unblock(userId);
        setBlocked(false);
      } else {
        // Optimistic
        BlockStore.add(userId);
        await BlockService.block(userId);
        setBlocked(true);
        // Also reflect follow state locally; block will unfollow on server
        setFollowing(false);
        try {
          FollowStore.remove(userId);
        } catch {}
        if (wasFollowing) {
          setFollowersCount((n) => Math.max(0, n - 1));
        }
      }
    } catch (e) {
      console.warn("block toggle failed", e);
    }
  };

  // 相対時間は共通関数を使用

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBar />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プロフィール</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* プロフィールヘッダーは PostList の ListHeaderComponent に移動し、スクロールに追従させる */}

      {/* 投稿一覧（キーボード表示時にレイアウトを持ち上げて、スクロール調整が効くように） */}
      <KeyboardAwareScrollView style={styles.scrollView}>
        <PostList
          posts={postsData}
          likedPosts={likedPosts}
          showReplyButtons={showReplyButtons}
          hasMore={false}
          replyCounts={replyCounts}
          authorAverageDays={averageDays}
          allowBlockedReplies={true}
          headerComponent={
            <View>
              <View style={styles.profileHeaderCenter}>
                <AvatarImage
                  uri={avatar}
                  size={88}
                  style={styles.profileAvatar}
                />
                <Text style={styles.profileName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.profileRank} numberOfLines={1}>
                  {getRankDisplayByDays(averageDays)}
                </Text>
              </View>

              {user?.uid !== userId && (
                <View style={styles.ctaRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={onToggleFollow}
                    style={[
                      styles.primaryCta,
                      following && styles.primaryCtaActive,
                    ]}
                  >
                    <Ionicons
                      name={following ? "checkmark" : "person-add-outline"}
                      size={18}
                      color={colors.black}
                      style={styles.ctaIcon}
                    />
                    <Text style={styles.primaryCtaText}>
                      {following ? "フォロー中" : "フォロー"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={onToggleBlock}
                    style={[styles.ghostCta, blocked && styles.ghostCtaActive]}
                  >
                    <Ionicons
                      name={blocked ? "close-circle" : "remove-circle-outline"}
                      size={18}
                      color={blocked ? colors.gray800 : colors.textSecondary}
                      style={styles.ctaIcon}
                    />
                    <Text
                      style={[
                        styles.ghostCtaText,
                        blocked && styles.ghostCtaTextActive,
                      ]}
                    >
                      {blocked ? "ブロック中" : "ブロック"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 投稿/フォロー/フォロワー カウント（余計な隙間を作らないため Divider は置かない） */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{postsData.length}</Text>
                  <Text style={styles.statLabel}>投稿</Text>
                </View>
                <View style={styles.statDivider} />
                <TouchableOpacity
                  style={styles.statItem}
                  activeOpacity={0.8}
                  onPress={() =>
                    (navigation as any).navigate("FollowList", {
                      userId,
                      userName: name,
                      mode: "following",
                    })
                  }
                >
                  <Text style={styles.statNumber}>{followingCount}</Text>
                  <Text style={styles.statLabel}>フォロー</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <TouchableOpacity
                  style={styles.statItem}
                  activeOpacity={0.8}
                  onPress={() =>
                    (navigation as any).navigate("FollowList", {
                      userId,
                      userName: name,
                      mode: "followers",
                    })
                  }
                >
                  <Text style={styles.statNumber}>{followersCount}</Text>
                  <Text style={styles.statLabel}>フォロワー</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          onLike={(id) => {
            void handleLike(id);
          }}
          onComment={handleComment}
          onReply={handleReply}
          onUserPress={(uid, uname) =>
            handlePostPress({ authorId: uid, authorName: uname } as any)
          }
          listStyle={{ flex: 1 }}
          contentContainerStyle={uiStyles.listContainer}
          onEndReached={() => {
            if (!hasMore || loadingMore || postsData.length === 0) return;
            // TODO: ページング対応を実装
          }}
          loadingMore={loadingMore}
        />
      </KeyboardAwareScrollView>

      {/* 返信入力フィールド */}
      {replyingTo && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 16}
        >
          <ReplyInputBar
            value={replyText}
            onChangeText={setReplyText}
            onCancel={handleReplyCancel}
            onSubmit={handleReplySubmit}
            autoFocus
          />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundTertiary,
    },
    scrollView: {
      backgroundColor: colors.backgroundTertiary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    backButton: { padding: spacing.sm },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: typography.fontSize.lg,
      fontWeight: "bold",
      color: colors.gray800,
    },
    listContainer: {
      backgroundColor: colors.backgroundSecondary,
    },
    empty: {
      paddingVertical: spacing["3xl"],
      alignItems: "center",
    },
    emptyText: {
      color: colors.textSecondary,
    },
    // 新しいプロフィールヘッダー（縦並び: アイコン → 名前 → 階級）
    profileHeaderCenter: {
      alignItems: "center",
      paddingHorizontal: spacing.xl,
      paddingTop: spacing["2xl"],
      paddingBottom: spacing.lg,
      backgroundColor: colors.backgroundSecondary,
    },
    profileAvatar: {
      marginBottom: spacing.md,
    },
    profileName: {
      fontSize: typography.fontSize.lg,
      fontWeight: "700",
      color: colors.gray800,
    },
    profileRank: {
      marginTop: 4,
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    // CTA 行（左: フォロー[黄塗り] 右: ブロック[枠線のみ]）
    ctaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
      backgroundColor: colors.backgroundSecondary,
    },
    primaryCta: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FACC15", // amber-400 に近い黄
      borderRadius: 28,
      paddingVertical: 10,
    },
    primaryCtaActive: {
      backgroundColor: "#FDE047", // amber-300 っぽい薄黄（フォロー中）
    },
    primaryCtaText: {
      color: colors.black,
      fontSize: typography.fontSize.base,
      fontWeight: "700",
    },
    ghostCta: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      borderRadius: 28,
      paddingVertical: 10,
    },
    ghostCtaActive: {
      backgroundColor: "#E5E7EB",
      borderColor: "#CBD5E1",
    },
    ghostCtaText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.base,
      fontWeight: "700",
    },
    ghostCtaTextActive: {
      color: colors.gray800,
    },
    ctaIcon: {
      marginRight: 8,
    },
    // 旧スタイル（参照用）
    actionsRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    userProfileContainer: {
      flex: 1,
      marginRight: spacing.sm,
    },
    followBtn: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      minHeight: 28,
      borderColor: "#F87171",
      backgroundColor: colors.backgroundSecondary,
    },
    followText: {
      color: "#F87171",
      fontSize: typography.fontSize.xs,
      fontWeight: "600",
    },
    follow: {
      backgroundColor: colors.backgroundSecondary,
    },
    following: {
      backgroundColor: "#FDE2E2",
    },
    followingText: {
      color: "#EF4444",
      fontWeight: "700",
    },
    blockBtn: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      minHeight: 28,
    },
    blockText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.xs,
      fontWeight: "600",
    },
    block: {
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.borderPrimary,
    },
    blocking: {
      backgroundColor: "#E5E7EB",
      borderColor: "#9CA3AF",
    },
    blockingText: {
      color: colors.gray800,
      fontWeight: "700",
    },
    divider: {
      height: 8,
      backgroundColor: colors.backgroundTertiary,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.borderPrimary,
    },
    postItem: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      backgroundColor: colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    postHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    postAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: spacing.md,
    },
    postAvatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.gray100,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    },
    postAvatarInitial: { fontWeight: "700", color: colors.textSecondary },
    postAuthor: {
      fontSize: typography.fontSize.base,
      fontWeight: "700",
      color: colors.gray800,
    },
    postDot: { marginHorizontal: 6, color: colors.textSecondary },
    postTime: { fontSize: typography.fontSize.sm, color: colors.textSecondary },
    postContent: {
      fontSize: typography.fontSize.base,
      color: colors.textPrimary,
      lineHeight: 22,
      marginBottom: spacing.sm,
      marginLeft: 56,
    }, // アバター40px + マージン16px = 56px
    postActions: { flexDirection: "row", alignItems: "center", marginLeft: 56 }, // アバター40px + マージン16px = 56px
    postAction: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: spacing["3xl"],
    },
    postActionText: { marginLeft: 6, color: colors.textSecondary },
    replyInputContainer: {
      backgroundColor: colors.gray50,
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.borderPrimary,
    },
    replyInput: {
      fontSize: typography.fontSize.base,
      color: colors.textPrimary,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      minHeight: 80,
      textAlignVertical: "top",
      marginBottom: spacing.md,
    },
    replyInputActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: spacing.md,
    },
    replyCancelButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    replyCancelText: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      fontWeight: typography.fontWeight.medium as any,
    },
    replySubmitButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 20,
      minWidth: 60,
      alignItems: "center",
    },
    replySubmitButtonDisabled: { backgroundColor: colors.gray300 },
    replySubmitText: {
      fontSize: typography.fontSize.sm,
      color: colors.white,
      fontWeight: typography.fontWeight.semibold as any,
    },
    replySubmitTextDisabled: { color: colors.gray500 },
    // stats
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.backgroundSecondary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.borderPrimary,
    },
    statItem: {
      flex: 1,
      alignItems: "center",
    },
    statNumber: {
      fontSize: typography.fontSize.lg,
      fontWeight: "700",
      color: colors.gray800,
    },
    statLabel: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statDivider: {
      width: 1,
      alignSelf: "stretch",
      backgroundColor: colors.borderPrimary,
      marginHorizontal: spacing.lg,
      opacity: 0.6,
    },
  });

export default UserDetailScreen;
