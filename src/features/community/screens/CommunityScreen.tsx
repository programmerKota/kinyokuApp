import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CreatePostModal from "@features/community/components/CreatePostModal";
import PostList from "@features/community/components/PostList";
import useCommunity from "@features/community/hooks/useCommunity";
import type { CommunityPost } from "@project-types";
import { useAuthPrompt } from "@shared/auth/AuthPromptProvider";
import Button from "@shared/components/Button";
import KeyboardAwareScrollView from "@shared/components/KeyboardAwareScrollView";
import {
  spacing,
  typography,
  shadows,
  useAppTheme,
  useThemedStyles,
} from "@shared/theme";
import AppStatusBar from "@shared/theme/AppStatusBar";
import { colorSchemes, type ColorPalette } from "@shared/theme/colors";
import { createUiStyles } from "@shared/ui/styles";
import { navigateToUserDetail } from "@shared/utils/navigation";

import type { RootStackParamList } from "@app/navigation/RootNavigator";

const CommunityScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [state, actions] = useCommunity();
  const { requireAuth } = useAuthPrompt();
  const { mode } = useAppTheme();
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const uiStyles = useThemedStyles(createUiStyles);
  const styles = useThemedStyles(createStyles);
  const {
    posts,
    likedPosts,
    activeTab,
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
    handleTabPress,
    loadMore,
  } = actions;
  // 相対時間は各セル内の RelativeTime コンポーネントで個別に更新する

  const handlePostPress = useCallback(
    (post: CommunityPost) => {
      navigateToUserDetail(
        navigation,
        post.authorId,
        post.authorName,
        post.authorAvatar,
      );
    },
    [navigation],
  );

  const handleReplyPress = useCallback(
    async (postId: string) => {
      const ok = await requireAuth();
      if (!ok) return;
      handleReply(postId);
      const post = posts.find((p) => p.id === postId);
      const previewRaw = post?.content?.trim();
      const preview =
        previewRaw && previewRaw.length > 160
          ? `${previewRaw.slice(0, 160).trim()}…`
          : previewRaw ?? undefined;
      navigation.navigate("CommunityReplyComposer", {
        postId,
        postAuthorName: post?.authorName,
        postContentPreview: preview,
      });
    },
    [handleReply, navigation, posts, requireAuth],
  );

  // PostList が各種描画を担当

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppStatusBar />

      <View style={uiStyles.tabBar}>
        <TouchableOpacity
          style={[uiStyles.tab, activeTab === "all" && uiStyles.tabActive]}
          onPress={() => handleTabPress("all")}
        >
          <Text
            style={[
              uiStyles.tabText,
              activeTab === "all" && uiStyles.tabTextActive,
            ]}
          >
            すべて
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[uiStyles.tab, activeTab === "my" && uiStyles.tabActive]}
          onPress={() => handleTabPress("my")}
        >
          <Text
            style={[
              uiStyles.tabText,
              activeTab === "my" && uiStyles.tabTextActive,
            ]}
          >
            My投稿
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            uiStyles.tab,
            activeTab === "following" && uiStyles.tabActive,
          ]}
          onPress={() => handleTabPress("following")}
        >
          <Text
            style={[
              uiStyles.tabText,
              activeTab === "following" && uiStyles.tabTextActive,
            ]}
          >
            フォロー
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView style={styles.scrollView}>
        <PostList
          key={`postlist-${activeTab}`}
          posts={posts}
          likedPosts={likedPosts}
          showReplyButtons={showReplyButtons}
          replyCounts={replyCounts}
          authorAverageDays={userAverageDays}
          hasMore={activeTab === "all" ? hasMore : false}
          onLike={(id) => {
            void handleLike(id);
          }}
          onComment={handleComment}
          onReply={handleReplyPress}
          onUserPress={(uid, uname) =>
            handlePostPress({
              authorId: uid,
              authorName: uname,
            } as CommunityPost)
          }
          contentContainerStyle={uiStyles.listContainer}
          onEndReached={() => {
            if (!hasMore || loadingMore || posts.length === 0) return;
            void loadMore();
          }}
          onEndReachedThreshold={0.4}
          loadingMore={loadingMore}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            posts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="chatbubble-outline"
                  size={64}
                  color={colors.gray300}
                />
                <Text style={styles.emptyTitle}>
                  {activeTab === "all" && "投稿がありません"}
                  {activeTab === "my" && "自分の投稿がありません"}
                  {activeTab === "following" && "フォロー中の投稿がありません"}
                </Text>
                <Text style={styles.emptyText}>
                  {activeTab === "all" && "最初の投稿を作成してみましょう"}
                  {activeTab === "my" && "まだ投稿していません"}
                  {activeTab === "following" &&
                    "フォローしているユーザーがいません"}
                </Text>
                {activeTab === "all" && (
                  <Button
                    title="投稿を作成"
                    onPress={() => setShowCreateModal(true)}
                    style={styles.emptyButton}
                  />
                )}
              </View>
            ) : null
          }
        />
      </KeyboardAwareScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={async () => {
          const ok = await requireAuth();
          if (ok) setShowCreateModal(true);
        }}
      >
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

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
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
      fontSize: typography.fontSize["2xl"],
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
    },
    tabContainer: {
      flexDirection: "row",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      backgroundColor: colors.backgroundPrimary,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    tab: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      marginRight: spacing["3xl"],
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: colors.info,
    },
    tabText: {
      fontSize: typography.fontSize.base,
      fontWeight: "500",
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
      position: "absolute",
      bottom: spacing.xl,
      right: spacing.xl,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.info,
      justifyContent: "center",
      alignItems: "center",
      ...shadows.lg,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: spacing["5xl"],
    },
    emptyTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: "600",
      color: colors.textSecondary,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    emptyText: {
      fontSize: typography.fontSize.sm,
      color: colors.textTertiary,
      textAlign: "center",
      marginBottom: spacing["2xl"],
    },
    emptyButton: {
      paddingHorizontal: spacing["3xl"],
    },
    scrollView: {
      backgroundColor: colors.backgroundTertiary,
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
      fontWeight: typography.fontWeight.medium,
    },
    replySubmitButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 20,
      minWidth: 60,
      alignItems: "center",
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
