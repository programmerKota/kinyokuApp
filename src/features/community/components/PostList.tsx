import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, memo, useRef, useMemo } from "react";
import {
  Dimensions,
  InteractionManager,
  Keyboard,
  type KeyboardEvent,
  Platform,
} from "react-native";
import ReplyUiStore from "@shared/state/replyUiStore";
import {
  FlatList,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import type { RefreshControlProps, StyleProp, ViewStyle } from "react-native";

import PostCard from "@features/community/components/PostCard";
import RepliesList from "@features/community/components/RepliesList";
import type { CommunityPost } from "@project-types";
import ListFooterSpinner from "@shared/components/ListFooterSpinner";
import { useReplyVisibility } from "@shared/state/replyVisibilityStore";
import { spacing, typography, useAppTheme, useThemedStyles } from "@shared/theme";
import { colorSchemes, type ColorPalette } from "@shared/theme/colors";
import { CONTENT_LEFT_MARGIN } from "@shared/utils/nameUtils";
import { Logger } from "@shared/utils/logger";

interface PostListProps {
  posts: CommunityPost[];
  likedPosts: Set<string>;
  showReplyButtons: Set<string>;
  replyCounts?: Map<string, number>;
  authorAverageDays?: Map<string, number> | number;
  allowBlockedReplies?: boolean;
  onLike: (postId: string) => void | Promise<void>;
  onComment: (postId: string) => void;
  onReply: (postId: string) => void;
  onUserPress: (userId: string, userName: string, userAvatar?: string) => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  listStyle?: StyleProp<ViewStyle>;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  loadingMore?: boolean;
  hasMore?: boolean;
  headerComponent?: React.ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  ListEmptyComponent?: React.ReactNode;
}

const PostList: React.FC<PostListProps> = ({
  posts,
  likedPosts,
  showReplyButtons,
  authorAverageDays,
  replyCounts,
  allowBlockedReplies = false,
  onLike,
  onComment,
  onReply,
  onUserPress,
  contentContainerStyle,
  listStyle,
  onEndReached,
  onEndReachedThreshold = 0.4,
  loadingMore = false,
  hasMore = false,
  headerComponent,
  refreshControl,
  ListEmptyComponent: emptyComponent,
}) => {
  const { mode } = useAppTheme();
  const colors = useMemo(() => colorSchemes[mode], [mode]);

  const listRef = useRef<FlatList<CommunityPost>>(null);
  const scrollYRef = useRef(0);
  const viewportHRef = useRef(Dimensions.get("window").height);

  const scrollToReplyButton = useCallback(
    (postId: string, btnRef: React.RefObject<View>) => {
      const node = btnRef?.current;
      const list = listRef.current;
      if (!list || !node) return;

      let done = false;
      let kbTop: number | null = null;
      const needHeight = () => (ReplyUiStore.getInputBarHeight?.() || 0) > 60;

      const cleanupAll = (
        subs: { remove?: () => void }[],
        extra: (() => void)[] = [],
      ) => {
        for (const s of subs) {
          try {
            s?.remove?.();
          } catch {}
        }
        for (const f of extra) {
          try {
            f();
          } catch {}
        }
      };

      const tryScroll = () => {
        if (done) return;
        if (!needHeight()) return; // wait until input bar height is measured
        done = true;
        requestAnimationFrame(() => {
          try {
            node.measureInWindow?.(
              (x: number, y: number, w: number, h: number) => {
                const viewportH =
                  viewportHRef.current || Dimensions.get("window").height;
                const keyboardTop = kbTop ?? viewportH;
                const inputH = ReplyUiStore.getInputBarHeight();
                const gap = 8;
                const targetBottom = Math.max(0, keyboardTop - inputH - gap);
                const buttonBottom = (y || 0) + (h || 0);
                const delta = (buttonBottom || 0) - targetBottom;
                const newOffset = Math.max(
                  0,
                  (scrollYRef.current || 0) + (delta || 0),
                );
                try {
                  list.scrollToOffset({ offset: newOffset, animated: true });
                } catch (e) {
                  Logger.warn("PostList.scrollToOffset", e);
                }
              },
            );
          } catch (e) {
            Logger.warn("PostList.measureFallback", e);
            try {
              const index = posts.findIndex((p) => p.id === postId);
              if (index >= 0)
                list.scrollToIndex({
                  index,
                  animated: true,
                  viewPosition: 0.98,
                });
            } catch (e2) {
              Logger.warn("PostList.scrollToIndexFallback", e2);
            }
          }
        });
      };

      const subs: { remove?: () => void }[] = [];
      const extra: (() => void)[] = [];

      // Subscribe to input bar height updates; fire once when height is ready
      const unsubHeight = ReplyUiStore.subscribe?.(() => {
        if (needHeight()) {
          tryScroll();
        }
      });
      if (unsubHeight) extra.push(unsubHeight);

      // Keyboard events to capture top coordinate
      const did = Keyboard.addListener("keyboardDidShow", (e: KeyboardEvent) => {
        const sy = e?.endCoordinates?.screenY as number | undefined;
        if (typeof sy === "number") kbTop = sy;
        tryScroll();
      });
      subs.push(did);

      if (Platform.OS === "ios") {
        const will = Keyboard.addListener("keyboardWillShow", (e: KeyboardEvent) => {
          const sy = e?.endCoordinates?.screenY as number | undefined;
          if (typeof sy === "number") kbTop = sy;
          // Don't scroll yet if height not ready; tryScroll will guard
          tryScroll();
        });
        subs.push(will);
      }

      // Fallback: if no events fire, attempt once after a short delay
      const t = setTimeout(() => tryScroll(), 320);
      extra.push(() => clearTimeout(t));

      // Final cleanup (prevent leaks)
      const end = setTimeout(() => cleanupAll(subs, extra), 1600);
      extra.push(() => clearTimeout(end));
    },
    [posts],
  );

  const renderItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <PostListRow
        item={item}
        likedPosts={likedPosts}
        authorAverageDays={authorAverageDays}
        replyCounts={replyCounts}
        allowBlockedReplies={allowBlockedReplies}
        onLike={onLike}
        onComment={onComment}
        onReply={onReply}
        onScrollToReplyButton={scrollToReplyButton}
        onUserPress={onUserPress}
      />
    ),
    [
      likedPosts,
      authorAverageDays,
      replyCounts,
      allowBlockedReplies,
      onLike,
      onComment,
      onReply,
      scrollToReplyButton,
      onUserPress,
    ],
  );

  const extra = React.useMemo(
    () => ({
      likedPosts,
      replyCounts,
      authorAverageDays,
      loadingMore,
      hasMore,
    }),
    [likedPosts, replyCounts, authorAverageDays, loadingMore, hasMore],
  );

  return (
    <FlatList
      ref={listRef}
      extraData={extra}
      onLayout={(e) => {
        try {
          viewportHRef.current =
            e?.nativeEvent?.layout?.height || viewportHRef.current;
        } catch (err) {
          Logger.warn("PostList.onLayout", err);
        }
      }}
      onScroll={(e) => {
        try {
          scrollYRef.current = e?.nativeEvent?.contentOffset?.y || 0;
        } catch (err) {
          Logger.warn("PostList.onScroll", err);
        }
      }}
      scrollEventThrottle={16}
      style={listStyle}
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={
        headerComponent ? (() => <>{headerComponent}</>) : undefined
      }
      onEndReachedThreshold={onEndReached ? onEndReachedThreshold : undefined}
      onEndReached={() => {
        if (onEndReached && hasMore && !loadingMore) onEndReached();
      }}
      ListFooterComponent={() =>
        loadingMore && hasMore ? <ListFooterSpinner loading /> : null
      }
      refreshControl={refreshControl}
      onScrollToIndexFailed={(info) => {
        setTimeout(() => {
          try {
            listRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
              viewPosition: 1,
            });
          } catch (err) {
            Logger.warn("PostList.onScrollToIndexFailed", err);
          }
        }, 80);
      }}
      ListEmptyComponent={() => {
        const isRefreshing = refreshControl?.props?.refreshing;
        if (isRefreshing && (posts?.length ?? 0) === 0) {
          return (
            <View style={stylesEmpty.loadingContainer}>
              <ActivityIndicator size="large" color={colors.info} />
            </View>
          );
        }
        return emptyComponent ? <>{emptyComponent}</> : null;
      }}
      initialNumToRender={8}
      windowSize={7}
      maxToRenderPerBatch={12}
      removeClippedSubviews
    />
  );
};

export default memo(PostList);

const PostListRow: React.FC<{
  item: CommunityPost;
  likedPosts: Set<string>;
  authorAverageDays?: Map<string, number> | number;
  allowBlockedReplies?: boolean;
  replyCounts?: Map<string, number>;
  onLike: (postId: string) => void | Promise<void>;
  onComment: (postId: string) => void;
  onReply: (postId: string) => void;
  onScrollToReplyButton: (postId: string, ref: React.RefObject<any>) => void;
  onUserPress: (userId: string, userName: string, userAvatar?: string) => void;
}> = memo(
  ({
    item,
    likedPosts,
    authorAverageDays,
    allowBlockedReplies = false,
    replyCounts,
    onLike,
    onComment,
    onReply,
    onScrollToReplyButton,
    onUserPress,
  }) => {
    const replyBtnRef = React.useRef<any>(null);
    const visible = useReplyVisibility(item.id, false);
    const { mode } = useAppTheme();
    const colors = useMemo(() => colorSchemes[mode], [mode]);
    const rowStyles = useThemedStyles(createRowStyles);

    const avgDays =
      typeof authorAverageDays === "number"
        ? authorAverageDays
        : ((authorAverageDays as Map<string, number>)?.get?.(
            item.authorId,
          ) as number) || 0;
    const comments = replyCounts?.get(item.id) ?? item.comments ?? 0;

    return (
      <View>
        <PostCard
          post={item}
          postId={item.id}
          onLikeId={onLike}
          onCommentId={onComment}
          onReplyId={onReply}
          onUserPressId={(uid, uname) =>
            onUserPress(uid, uname, item.authorAvatar)
          }
          initialIsLiked={likedPosts.has(item.id)}
          authorAverageDays={avgDays}
          commentsCount={comments}
        />

        {false && visible && (
          <View style={rowStyles.replyButtonContainer}>
            <View style={rowStyles.replyButtonSpacer} />
            <TouchableOpacity
              style={rowStyles.replyButton}
              onPress={() => {
                onReply(item.id);
                // 入力欄とキーボード表示に合わせて自動調整
                onScrollToReplyButton(item.id, replyBtnRef);
              }}
              ref={replyBtnRef}
            >
              <View style={rowStyles.replyIconContainer}>
                <Ionicons name="add" size={16} color={colors.white} />
              </View>
              <Text style={rowStyles.replyText}>返信を書く</Text>
            </TouchableOpacity>
          </View>
        )}

        {visible && (
          <RepliesList
            postId={item.id}
            onUserPress={(uid, uname, uavatar) =>
              onUserPress(uid, uname, uavatar)
            }
            allowBlockedReplies={allowBlockedReplies}
          />
        )}

        {visible && (
          <View style={rowStyles.replyButtonContainer}>
            <View style={rowStyles.replyButtonSpacer} />
            <TouchableOpacity
              style={rowStyles.replyButton}
              onPress={() => {
                onReply(item.id);
                // 入力欄とキーボード表示に合わせて自動調整
                onScrollToReplyButton(item.id, replyBtnRef);
              }}
              ref={replyBtnRef}
            >
              <View style={rowStyles.replyIconContainer}>
                <Ionicons name="add" size={16} color={colors.white} />
              </View>
              <Text style={rowStyles.replyText}>返信を書く</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  },
);

const createRowStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    replyButtonContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundSecondary,
    },
    replyButtonSpacer: {
      width: spacing.lg + CONTENT_LEFT_MARGIN.small,
    },
    replyButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "transparent",
      paddingHorizontal: 0,
      paddingVertical: spacing.xs,
      borderRadius: 8,
      alignSelf: "flex-start",
    },
    replyIconContainer: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.info,
      justifyContent: "center",
      alignItems: "center",
    },
    replyText: {
      fontSize: typography.fontSize.sm,
      color: colors.info,
      marginLeft: spacing.sm,
      fontWeight: "500",
    },
  });

const stylesEmpty = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing["5xl"],
  },
});
