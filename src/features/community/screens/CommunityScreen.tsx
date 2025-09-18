import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';

import Button from '@shared/components/Button';
import ReplyInputBar from '@shared/components/ReplyInputBar';
import KeyboardAwareScrollView from '@shared/components/KeyboardAwareScrollView';
import ListFooterSpinner from '@shared/components/ListFooterSpinner';
import { uiStyles } from '@shared/ui/styles';
import { colors, spacing, typography, shadows } from '@shared/theme';
import { navigateToUserDetail } from '@shared/utils/navigation';
import type { CommunityPost } from '@project-types';

import CreatePostModal from '@features/community/components/CreatePostModal';
import PostList from '@features/community/components/PostList';
import useCommunity from '@features/community/hooks/useCommunity';
import type { TournamentStackParamList } from '@app/navigation/TournamentStackNavigator';

type Nav = StackNavigationProp<TournamentStackParamList>;

const CommunityScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [state, actions] = useCommunity();
  const {
    posts,
    likedPosts,
    activeTab,
    replyingTo,
    replyText,
    showReplyButtons,
    replyCounts,
    userAverageDays,
    refreshing,
    showCreateModal,
    loadingMore,
    hasMore,
  } = state;
  const {
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
  } = actions;
  // 相対時間は各セル内の RelativeTime コンポーネントで個別に更新する

  const handlePostPress = useCallback(
    (post: CommunityPost) => {
      navigateToUserDetail(navigation, post.authorId, post.authorName, post.authorAvatar);
    },
    [navigation],
  );

  // PostList が各種描画を担当

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />

      <View style={uiStyles.tabBar}>
        <TouchableOpacity
          style={[uiStyles.tab, activeTab === 'all' && uiStyles.tabActive]}
          onPress={() => handleTabPress('all')}
        >
          <Text style={[uiStyles.tabText, activeTab === 'all' && uiStyles.tabTextActive]}>
            すべて
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[uiStyles.tab, activeTab === 'my' && uiStyles.tabActive]}
          onPress={() => handleTabPress('my')}
        >
          <Text style={[uiStyles.tabText, activeTab === 'my' && uiStyles.tabTextActive]}>
            My投稿
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[uiStyles.tab, activeTab === 'following' && uiStyles.tabActive]}
          onPress={() => handleTabPress('following')}
        >
          <Text style={[uiStyles.tabText, activeTab === 'following' && uiStyles.tabTextActive]}>
            フォロー
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView>
        <PostList
          posts={posts}
          likedPosts={likedPosts}
          showReplyButtons={showReplyButtons}
          authorAverageDays={userAverageDays}
          onLike={(id) => { void handleLike(id); }}
          onComment={handleComment}
          onReply={handleReply}
          onUserPress={(uid, uname) => handlePostPress({ authorId: uid, authorName: uname } as CommunityPost)}
          contentContainerStyle={uiStyles.listContainer}
          onEndReached={() => {
            if (!hasMore || loadingMore || posts.length === 0) return;
            void loadMore();
          }}
          onEndReachedThreshold={0.4}
          loadingMore={loadingMore}
          ListEmptyComponent={
            posts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-outline" size={64} color={colors.gray300} />
                <Text style={styles.emptyTitle}>
                  {activeTab === 'all' && '投稿がありません'}
                  {activeTab === 'my' && '自分の投稿がありません'}
                  {activeTab === 'following' && 'フォロー中の投稿がありません'}
                </Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'all' && '最初の投稿を作成してみましょう'}
                  {activeTab === 'my' && 'まだ投稿していません'}
                  {activeTab === 'following' && 'フォローしているユーザーがいません'}
                </Text>
                {activeTab === 'all' && (
                  <Button
                    title="投稿を作成"
                    onPress={() => setShowCreateModal(true)}
                    style={styles.emptyButton}
                  />
                )}
                {activeTab === 'following' && (
                  <Button
                    title="投稿者をフォロー"
                    onPress={() => {
                      /* noop */
                    }}
                    style={styles.emptyButton}
                  />
                )}
              </View>
            ) : null
          }
        />
      </KeyboardAwareScrollView>

      {replyingTo && (
        <ReplyInputBar
          value={replyText}
          onChangeText={setReplyText}
          onCancel={handleReplyCancel}
          onSubmit={() => { void handleReplySubmit(); }}
          autoFocus
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
        <Ionicons name="add" size={24} color={colors.white} />
      </TouchableOpacity>

      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => {
          void handleCreatePost(data);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.backgroundPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.backgroundPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginRight: spacing['3xl'],
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.info,
  },
  tabText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.info,
  },
  listContainer: {
    padding: spacing.xl,
    backgroundColor: colors.backgroundSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.info,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  emptyButton: {
    paddingHorizontal: spacing['3xl'],
  },
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
  replyCancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  replyCancelText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  replySubmitButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  replySubmitButtonDisabled: {
    backgroundColor: colors.gray300,
  },
  replySubmitText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  replySubmitTextDisabled: {
    color: colors.gray500,
  },
});

export default CommunityScreen;
