import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

import { colors, spacing, typography } from '@shared/theme';
import uiStyles from '@shared/ui/styles';
import { getContentStyle, CONTENT_LEFT_MARGIN, getBlockLeftMargin } from '@shared/utils/nameUtils';
import type { CommunityPost } from '@project-types';

import RelativeTime from '@shared/components/RelativeTime';
import UserProfileWithRank from '@shared/components/UserProfileWithRank';

interface PostCardProps {
  post: CommunityPost;
  commentsCount?: number;
  postId?: string;
  onLikeId?: (postId: string) => void;
  onCommentId?: (postId: string) => void;
  onReplyId?: (postId: string) => void;
  onUserPressId?: (userId: string, userName: string) => void;
  isLiked?: boolean;
  showReplyButton?: boolean;
  authorAverageDays?: number;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  postId,
  onLikeId,
  onCommentId,
  onReplyId,
  onUserPressId,
  isLiked = false,
  showReplyButton = false,
  authorAverageDays = 0,
  commentsCount,
}) => {
  // Prefer static values carried on the post to avoid broad re-renders
  const displayName = post.authorName;
  const displayAvatar = post.authorAvatar;

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
            size="medium"
            showRank={false}
            showTitle={true}
            style={styles.userProfileContainer}
          />
          <RelativeTime value={post.createdAt} style={uiStyles.timestampRight} />
        </View>

        <View style={[styles.content, { marginLeft: getBlockLeftMargin('medium') }]}>
          <Text style={[styles.text, getContentStyle('medium')]}>{post.content}</Text>
          {post.imageUrl && <Image source={{ uri: post.imageUrl }} style={styles.postImage} />}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (onLikeId) onLikeId(postId ?? post.id);
            }}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={18}
              color={isLiked ? colors.error : colors.textSecondary}
            />
            <Text style={[styles.actionText, isLiked && styles.likedText]}>{post.likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onCommentId ? () => onCommentId(postId ?? post.id) : undefined}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.info} />
            <Text style={[styles.actionText, { color: colors.info }]}>
              {commentsCount ?? post.comments}
            </Text>
          </TouchableOpacity>
        </View>

        {showReplyButton && (
          <View style={styles.replyButtonContainer}>
            <View style={styles.replyButtonSpacer} />
            <TouchableOpacity
              style={styles.replyButton}
              onPress={onReplyId ? () => onReplyId(postId ?? post.id) : undefined}
            >
              <View style={styles.replyIconContainer}>
                <Ionicons name="add" size={16} color="white" />
              </View>
              <Text style={styles.replyText}>返信を書く</Text>
            </TouchableOpacity>
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
    width: '100%',
  },
  userProfileContainer: {
    flex: 1,
  },
  content: {
    marginBottom: spacing.sm,
  },
  text: {},
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginLeft: getBlockLeftMargin('medium'),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  likedText: {
    color: colors.error,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  replyText: {
    fontSize: typography.fontSize.sm,
    color: colors.info,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  replyButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyButtonSpacer: {
    width: CONTENT_LEFT_MARGIN.medium,
  },
  replyIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.info,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Allow only targeted updates (likes, comments, reply toggle)
export default React.memo(
  PostCard,
  (prev, next) => {
    const prevComments = (prev.commentsCount ?? prev.post.comments) || 0;
    const nextComments = (next.commentsCount ?? next.post.comments) || 0;
    return (
      prev.post.id === next.post.id &&
      prev.isLiked === next.isLiked &&
      prev.post.likes === next.post.likes &&
      prevComments === nextComments &&
      (prev.showReplyButton ?? false) === (next.showReplyButton ?? false)
    );
  },
);
