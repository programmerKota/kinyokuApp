import React, { useCallback } from 'react';
import { FlatList, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RefreshControlProps, StyleProp, ViewStyle } from 'react-native';

import type { CommunityPost } from '@project-types';
import ListFooterSpinner from '@shared/components/ListFooterSpinner';
 

import PostCard from '@features/community/components/PostCard';
import RepliesList from '@features/community/components/RepliesList';
import { useReplyVisibility } from '@shared/state/replyVisibilityStore';
import { colors, spacing, typography } from '@shared/theme';
import { CONTENT_LEFT_MARGIN } from '@shared/utils/nameUtils';

interface PostListProps {
    posts: CommunityPost[];
    likedPosts: Set<string>;
    showReplyButtons: Set<string>;
    replyCounts?: Map<string, number>;
    authorAverageDays?: Map<string, number> | number;
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
    ListEmptyComponent,
}) => {
    const renderItem = useCallback(
        ({ item }: { item: CommunityPost }) => {
            return (
                <PostListRow
                    item={item}
                    likedPosts={likedPosts}
                    authorAverageDays={authorAverageDays}
                    replyCounts={replyCounts}
                    onLike={onLike}
                    onComment={onComment}
                    onReply={onReply}
                    onUserPress={onUserPress}
                />
            );
        },
        [likedPosts, authorAverageDays, replyCounts, onLike, onComment, onReply, onUserPress],
    );

    return (
        <FlatList
            extraData={{ likedPosts, replyCounts, authorAverageDays, loadingMore, hasMore }}
            style={listStyle}
            data={posts}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={contentContainerStyle}
            ListHeaderComponent={headerComponent as any}
            onEndReachedThreshold={onEndReached ? onEndReachedThreshold : undefined}
            onEndReached={() => {
                if (onEndReached && hasMore && !loadingMore) {
                    onEndReached();
                }
            }}
            ListFooterComponent={() => (hasMore || loadingMore ? <ListFooterSpinner loading /> : null)}
            refreshControl={refreshControl}
            ListEmptyComponent={ListEmptyComponent as any}
        />
    );
};

export default PostList;

const PostListRow: React.FC<{
    item: CommunityPost;
    likedPosts: Set<string>;
    authorAverageDays?: Map<string, number> | number;
    replyCounts?: Map<string, number>;
    onLike: (postId: string) => void | Promise<void>;
    onComment: (postId: string) => void;
    onReply: (postId: string) => void;
    onUserPress: (userId: string, userName: string, userAvatar?: string) => void;
}> = ({ item, likedPosts, authorAverageDays, replyCounts, onLike, onComment, onReply, onUserPress }) => {
    const visible = useReplyVisibility(item.id, false);
    const avgDays =
        typeof authorAverageDays === 'number'
            ? authorAverageDays
            : ((authorAverageDays as Map<string, number>)?.get?.(item.authorId) as number) || 0;
    const comments = (replyCounts?.get(item.id) ?? item.comments ?? 0) as number;
    return (
        <View>
            <PostCard
                post={item}
                postId={item.id}
                onLikeId={onLike}
                onCommentId={onComment}
                onReplyId={onReply}
                onUserPressId={(uid, uname) => onUserPress(uid, uname, item.authorAvatar)}
                initialIsLiked={likedPosts.has(item.id)}
                authorAverageDays={avgDays}
                commentsCount={comments}
            />
            {visible && (
              <View style={rowStyles.replyButtonContainer}>
                <View style={rowStyles.replyButtonSpacer} />
                <TouchableOpacity style={rowStyles.replyButton} onPress={() => onReply(item.id)}>
                  <View style={rowStyles.replyIconContainer}>
                    <Ionicons name="add" size={16} color={colors.white} />
                  </View>
                  <Text style={rowStyles.replyText}>返信を書く</Text>
                </TouchableOpacity>
              </View>
            )}
            {visible && (
                <RepliesList postId={item.id} onUserPress={(uid, uname) => onUserPress(uid, uname)} />
            )}
        </View>
    );
};

const rowStyles = StyleSheet.create({
  replyButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  // Align with PostCard.postContent padding (spacing.lg) + content start (avatar+gap)
  replyButtonSpacer: {
    width: spacing.lg + CONTENT_LEFT_MARGIN.medium,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  replyIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.info,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyText: {
    fontSize: typography.fontSize.sm,
    color: colors.info,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
});





