import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, memo, useRef } from "react";
import { Dimensions } from "react-native";
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
import { colors, spacing, typography } from "@shared/theme";
import { CONTENT_LEFT_MARGIN } from "@shared/utils/nameUtils";

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
  const listRef = useRef<FlatList<any>>(null);
  const scrollYRef = useRef(0);
  const viewportHRef = useRef(Dimensions.get("window").height);

  const scrollToReplyButton = useCallback(
    (postId: string, btnRef: React.RefObject<any>) => {
      const node = (btnRef?.current as any) || null;
      if (!node) return;
      try {
        node.measureInWindow?.((x: number, y: number, w: number, h: number) => {
          const viewportH = viewportHRef.current || Dimensions.get("window").height;
          const inputH = ReplyUiStore.getInputBarHeight();
          const targetTop = Math.max(0, viewportH - inputH - 8 - h);
          const delta = y - targetTop;
          const newOffset = Math.max(0, scrollYRef.current + delta);
          try {
            listRef.current?.scrollToOffset({ offset: newOffset, animated: true });
          } catch {}
          // Re-adjust shortly after in case input bar height changes due to keyboard
          setTimeout(() => {
            try {
              node.measureInWindow?.((x2: number, y2: number, w2: number, h2: number) => {
                const vh = viewportHRef.current || Dimensions.get("window").height;
                const ih = ReplyUiStore.getInputBarHeight();
                const tTop = Math.max(0, vh - ih - 8 - h2);
                const d = y2 - tTop;
                const off = Math.max(0, scrollYRef.current + d);
                listRef.current?.scrollToOffset({ offset: off, animated: true });
              });
            } catch {}
          }, 160);
        });
      } catch {
        // fallback: best-effort align item near bottom
        try {
          const index = posts.findIndex((p) => p.id === postId);
          if (index >= 0)
            listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.9 });
        } catch {}
      }
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

  return (
    <FlatList
      ref={listRef}
      extraData={{
        likedPosts,
        replyCounts,
        authorAverageDays,
        loadingMore,
        hasMore,
      }}
      onLayout={(e) => {
        try {
          viewportHRef.current = e?.nativeEvent?.layout?.height || viewportHRef.current;
        } catch {}
      }}
      onScroll={(e) => {
        try {
          scrollYRef.current = e?.nativeEvent?.contentOffset?.y || 0;
        } catch {}
      }}
      scrollEventThrottle={16}
      style={listStyle}
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={headerComponent as any}
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
          } catch {}
        }, 80);
      }}
      ListEmptyComponent={() => {
        const isRefreshing = (refreshControl as any)?.props?.refreshing;
        if (isRefreshing && (posts?.length ?? 0) === 0) {
          return (
            <View style={stylesEmpty.loadingContainer}>
              <ActivityIndicator size="large" color={colors.info} />
            </View>
          );
        }
        return emptyComponent as any;
      }}
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
}> = memo(({
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
              setTimeout(() => onScrollToReplyButton(item.id, replyBtnRef), 80);
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
          onUserPress={(uid, uname) => onUserPress(uid, uname)}
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
              setTimeout(() => onScrollToReplyButton(item.id, replyBtnRef), 80);
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
});

const rowStyles = StyleSheet.create({
  replyButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
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
