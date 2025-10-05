import React, { useCallback } from "react";
import { View, Text, StyleSheet, Image } from "react-native";

import CommentBar from "@features/community/components/CommentBar";
import LikeBar from "@features/community/components/LikeBar";
import type { CommunityPost } from "@project-types";
import RelativeTime from "@shared/components/RelativeTime";
import UserProfileWithRank from "@shared/components/UserProfileWithRank";
import { useProfile } from "@shared/hooks/useProfile";
import { colors, spacing, typography } from "@shared/theme";
import uiStyles from "@shared/ui/styles";
import { getContentStyle, getBlockLeftMargin } from "@shared/utils/nameUtils";

interface PostCardProps {
  post: CommunityPost;
  commentsCount?: number;
  postId?: string;
  onLikeId?: (postId: string) => void;
  onCommentId?: (postId: string) => void;
  onReplyId?: (postId: string) => void;
  onUserPressId?: (userId: string, userName: string) => void;
  authorAverageDays?: number;
  initialIsLiked?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  postId,
  onLikeId,
  onCommentId,
  onReplyId,
  onUserPressId,
  authorAverageDays = 0,
  commentsCount,
  initialIsLiked = false,
}) => {
  // Prefer live profile when available; fallback to post snapshot
  const live = useProfile(post.authorId);
  const displayName = live?.displayName ?? post.authorName;
  const displayAvatar = live?.photoURL ?? post.authorAvatar;

  const handleProfilePress = useCallback(() => {
    if (onUserPressId) {
      onUserPressId(post.authorId, displayName);
      return;
    }
  }, [onUserPressId, post.authorId, displayName]);

  return (
    <View style={styles.container}>
      <View style={styles.postContent}>
        <View style={[uiStyles.rowStart, styles.header]}>
          <UserProfileWithRank
            userName={displayName}
            userAvatar={displayAvatar}
            averageDays={authorAverageDays}
            onPress={handleProfilePress}
            size="small"
            showRank={false}
            showTitle={true}
            style={styles.userProfileContainer}
          />
          <RelativeTime value={post.createdAt} style={styles.timestampRight} />
        </View>

        <View
          style={[styles.content, { marginLeft: getBlockLeftMargin("small") }]}
        >
          <Text style={[styles.text, getContentStyle("small")]}> 
            {post.content}
          </Text>
          {post.imageUrl && (
            <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
          )}
        </View>

        <View style={styles.footer}>
          <LikeBar
            postId={postId ?? post.id}
            initialLikes={post.likes || 0}
            initialIsLiked={initialIsLiked}
            onToggle={onLikeId}
          />

          <CommentBar
            postId={postId ?? post.id}
            initialCount={(commentsCount ?? post.comments) || 0}
            onPress={
              onCommentId ? () => onCommentId(postId ?? post.id) : undefined
            }
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    marginBottom: 0,
  },
  postContent: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 0,
    width: "100%",
    justifyContent: "space-between",
  },
  timestampRight: {
    marginLeft: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    flexShrink: 0,
  },
  userProfileContainer: {
    flex: 1,
  },
  content: {
    marginBottom: spacing.xs,
  },
  text: {},
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
    marginLeft: getBlockLeftMargin("small"),
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    fontWeight: "500",
  },
  // like styles moved to LikeBar
});

// Allow only targeted updates (likes, comments, reply toggle)
export default React.memo(PostCard, (prev, next) => {
  const prevComments = (prev.commentsCount ?? prev.post.comments) || 0;
  const nextComments = (next.commentsCount ?? next.post.comments) || 0;
  // Ignore like-related props; LikeBar updates via external store
  return (
    prev.post.id === next.post.id &&
    prevComments === nextComments &&
    prev.authorAverageDays === next.authorAverageDays &&
    prev.initialIsLiked === next.initialIsLiked
  );
});
