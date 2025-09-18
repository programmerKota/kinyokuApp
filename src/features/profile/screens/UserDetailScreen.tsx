import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';

import PostList from '@features/community/components/PostList';
import ListFooterSpinner from '@shared/components/ListFooterSpinner';
import UserProfileWithRank from '@shared/components/UserProfileWithRank';
import { useAuth } from '@app/contexts/AuthContext';
import { useProfile } from '@shared/hooks/useProfile';
import { CommunityService, FollowService, BlockService } from '@core/services/firestore';
import type { FirestoreCommunityPost } from '@core/services/firestore';
import { UserStatsService } from '@core/services/userStatsService';
import { colors, spacing, typography } from '@shared/theme';
import { navigateToUserDetail } from '@shared/utils/navigation';

type RootStackParamList = {
  UserDetail: { userId: string; userName?: string; userAvatar?: string };
};

type UserDetailRouteProp = RouteProp<RootStackParamList, 'UserDetail'>;

const UserDetailScreen: React.FC = () => {
  const route = useRoute<UserDetailRouteProp>();
  const navigation = useNavigation();
  const { userId, userName, userAvatar } = route.params || ({} as any);
  const { user } = useAuth();
  const [name, setName] = useState<string>(userName || 'ユーザー');
  const [avatar, setAvatar] = useState<string | undefined>(userAvatar);
  const live = useProfile(userId);
  const [following, setFollowing] = useState<boolean>(false);
  const [postsData, setPostsData] = useState<FirestoreCommunityPost[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [blocked, setBlocked] = useState<boolean>(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [showReplyButtons, setShowReplyButtons] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyCounts, setReplyCounts] = useState<Map<string, number>>(new Map());
  const [averageDays, setAverageDays] = useState(0);
  // 逕ｻ髱｢繝輔か繝ｼ繧ｫ繧ｹ荳ｭ縺ｯ豈守ｧ貞・謠冗判縺励※逶ｸ蟇ｾ譎る俣繧呈峩譁ｰ
  const [nowTick, setNowTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => setNowTick((t) => t + 1), 1000);
      return () => clearInterval(id);
    }, []),
  );

  useEffect(() => {
    setName((prev) => prev || 'User');
    if (!userId) {
      return;
    }
    void UserStatsService.getUserAverageDaysForRank(userId).then(setAverageDays);
  }, [userId]);
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
        unsubscribe = CommunityService.subscribeToUserPosts(userId, async (list) => {
          const normalized = list.map((post) => ({
            ...post,
            likes: Math.max(0, post.likes || 0),
            comments: Math.max(0, post.comments || 0),
          }));

          // 返信の取得はトークアイコン押下時に行うため、
          // ここでは Firestore から返信一覧を取得しない。
          // 表示用の件数は投稿の `comments` を利用する。
          const counts = new Map<string, number>();
          for (const post of normalized) {
            counts.set(post.id, post.comments || 0);
          }

          setReplyCounts(counts);
          setPostsData(normalized);

          if (user) {
            const liked = new Set<string>();
            for (const post of normalized) {
              try {
                const likedFlag = await CommunityService.isPostLikedByUser(post.id, user.uid);
                if (likedFlag) liked.add(post.id);
              } catch {}
            }
            setLikedPosts(liked);
          }
        });
      } catch {}
    })();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [userId, user]);

  const handlePostPress = (post: FirestoreCommunityPost) => {
    navigateToUserDetail(navigation, post.authorId, post.authorName, post.authorAvatar);
  };

  const handleLike = async (postId: string) => {
    try {
      const isLiked = await CommunityService.toggleLike(postId);
      setLikedPosts((prev) => {
        const s = new Set(prev);
        if (isLiked) s.add(postId);
        else s.delete(postId);
        return s;
      });
      setPostsData((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likes: isLiked ? p.likes + 1 : Math.max(0, p.likes - 1) } : p,
        ),
      );
    } catch (e) {
      console.warn('like toggle failed', e);
    }
  };

  const handleComment = (postId: string) => {
    setShowReplyButtons((prev) => {
      const s = new Set(prev);
      if (s.has(postId)) s.delete(postId);
      else s.add(postId);
      return s;
    });
  };

  const handleReply = (postId: string) => {
    setReplyingTo(postId);
    setReplyText('');
  };

  const handleReplySubmit = async () => {
    if (!replyingTo || !replyText.trim()) return;
    try {
      await CommunityService.addReply(replyingTo, { content: replyText.trim() });
      setReplyCounts((prev) => {
        const m = new Map(prev);
        m.set(replyingTo, (m.get(replyingTo) || 0) + 1);
        return m;
      });
      setReplyingTo(null);
      setReplyText('');
    } catch (e) {
      console.warn('reply failed', e);
    }
  };

  const handleReplyCancel = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  // PostList 繧剃ｽｿ逕ｨ縺吶ｋ縺溘ａ蛟句挨繝ｬ繝ｳ繝繝ｩ縺ｯ荳崎ｦ・

  const onToggleFollow = async () => {
    try {
      if (following) {
        await FollowService.unfollow(userId);
        setFollowing(false);
      } else {
        await FollowService.follow(userId);
        setFollowing(true);
      }
    } catch (e) {
      console.warn('follow toggle failed', e);
    }
  };

  const onToggleBlock = async () => {
    try {
      if (blocked) {
        await BlockService.unblock(userId);
        setBlocked(false);
      } else {
        await BlockService.block(userId);
        setBlocked(true);
      }
    } catch (e) {
      console.warn('block toggle failed', e);
    }
  };

  // 逶ｸ蟇ｾ譎る俣縺ｯ蜈ｱ騾夐未謨ｰ繧剃ｽｿ逕ｨ

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プロフィール</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* 繝励Ο繝輔ぅ繝ｼ繝ｫ繝倥ャ繝繝ｼ */}
      <View>
        <View style={styles.profileTop}>
          <UserProfileWithRank
            userName={live?.displayName ?? name}
            userAvatar={live?.photoURL ?? avatar}
            averageDays={averageDays}
            size="medium"
            showRank={false}
            showTitle={true}
            style={styles.userProfileContainer}
          />
          {user?.uid !== userId && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onToggleFollow}
                style={[styles.followBtn, following ? styles.following : styles.follow]}
              >
                <Text style={[styles.followText, following ? styles.followingText : styles.followText]}>
                  {following ? 'フォロー中' : 'フォロー'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onToggleBlock}
                style={[styles.blockBtn, blocked ? styles.blocking : styles.block]}
              >
                <Text style={[styles.blockText, blocked ? styles.blockingText : styles.blockText]}>
                  {blocked ? 'ブロック中' : 'ブロック'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.divider} />
      </View>

      {/* 投稿一覧 */}
      <PostList
        posts={postsData}
        likedPosts={likedPosts}
        replyCounts={replyCounts}
        showReplyButtons={showReplyButtons}
        authorAverageDays={averageDays}
        onLike={(id) => { void handleLike(id); }}
        onComment={handleComment}
        onReply={handleReply}
        onUserPress={(uid, uname) => handlePostPress({ authorId: uid, authorName: uname } as any)}
        listStyle={{ flex: 1 }}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 40 }]}
        onEndReached={() => {
          if (!hasMore || loadingMore || postsData.length === 0) return;
          // TODO: 繝壹・繧ｸ繝ｳ繧ｰ蜿門ｾ励ｒ螳溯｣・
        }}
        loadingMore={loadingMore}
      />

      {/* 霑比ｿ｡蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝・*/}
      {replyingTo && (
        <View style={styles.replyInputContainer}>
          <TextInput
            style={styles.replyInput}
            placeholder="返信を入力..."
            placeholderTextColor={colors.textSecondary}
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={280}
            autoFocus
          />
          <View style={styles.replyInputActions}>
            <TouchableOpacity onPress={handleReplyCancel} style={styles.replyCancelButton}>
              <Text style={styles.replyCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleReplySubmit}
              style={[
                styles.replySubmitButton,
                !replyText.trim() && styles.replySubmitButtonDisabled,
              ]}
              disabled={!replyText.trim()}
            >
              <Text
                style={[
                  styles.replySubmitText,
                  !replyText.trim() && styles.replySubmitTextDisabled,
                ]}
              >
                返信
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  backButton: { padding: spacing.sm },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.gray800,
  },
  listContainer: {
    backgroundColor: colors.white,
  },
  empty: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  userProfileContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  followBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    minHeight: 32,
    borderColor: '#F87171',
    backgroundColor: colors.white,
  },
  followText: {
    color: '#F87171',
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  follow: {
    backgroundColor: colors.white,
  },
  following: {
    backgroundColor: '#FDE2E2',
  },
  followingText: {
    color: '#EF4444',
    fontWeight: '700',
  },
  blockBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    minHeight: 32,
  },
  blockText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  block: {
    backgroundColor: colors.white,
    borderColor: colors.borderPrimary,
  },
  blocking: {
    backgroundColor: '#E5E7EB',
    borderColor: '#9CA3AF',
  },
  blockingText: {
    color: colors.gray800,
    fontWeight: '700',
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
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  postAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: spacing.md },
  postAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  postAvatarInitial: { fontWeight: '700', color: colors.textSecondary },
  postAuthor: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.gray800 },
  postDot: { marginHorizontal: 6, color: colors.textSecondary },
  postTime: { fontSize: typography.fontSize.sm, color: colors.textSecondary },
  postContent: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.sm,
    marginLeft: 56,
  }, // 繧｢繝舌ち繝ｼ40px + 繝槭・繧ｸ繝ｳ16px = 56px
  postActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 56 }, // 繧｢繝舌ち繝ｼ40px + 繝槭・繧ｸ繝ｳ16px = 56px
  postAction: { flexDirection: 'row', alignItems: 'center', marginRight: spacing['3xl'] },
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
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  replyInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
  },
  replyCancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
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
    alignItems: 'center',
  },
  replySubmitButtonDisabled: { backgroundColor: colors.gray300 },
  replySubmitText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold as any,
  },
  replySubmitTextDisabled: { color: colors.gray500 },
});

export default UserDetailScreen;
