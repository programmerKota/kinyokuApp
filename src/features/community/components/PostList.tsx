import React, { useCallback, useRef } from 'react';
import { FlatList, View } from 'react-native';
import type { RefreshControlProps, StyleProp, ViewStyle } from 'react-native';

import type { CommunityPost } from '@project-types';
import ListFooterSpinner from '@shared/components/ListFooterSpinner';

import PostCard from '@features/community/components/PostCard';
import RepliesList from '@features/community/components/RepliesList';

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
    const canLoadMoreRef = useRef(true);
    const renderItem = useCallback(
        ({ item }: { item: CommunityPost }) => {
            const avgDays =
                typeof authorAverageDays === 'number'
                    ? authorAverageDays
                    : (authorAverageDays?.get?.(item.authorId) as number) || 0;
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
                        isLiked={likedPosts.has(item.id)}
                        showReplyButton={showReplyButtons.has(item.id)}
                        authorAverageDays={avgDays}
                        commentsCount={comments}
                    />
                    {showReplyButtons.has(item.id) && (
                        <RepliesList
                            postId={item.id}
                            onUserPress={(uid, uname) => onUserPress(uid, uname)}
                        />
                    )}
                </View>
            );
        },
        [likedPosts, showReplyButtons, authorAverageDays, replyCounts, onLike, onComment, onReply, onUserPress],
    );

    return (
        <FlatList
            extraData={{ likedPosts, showReplyButtons, replyCounts, authorAverageDays, loadingMore, hasMore }}
            style={listStyle}
            data={posts}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={contentContainerStyle}
            ListHeaderComponent={headerComponent as any}
            onEndReachedThreshold={onEndReached ? onEndReachedThreshold : undefined}
            onMomentumScrollBegin={() => {
                canLoadMoreRef.current = true;
            }}
            onEndReached={() => {
                if (!onEndReached) return;
                if (!hasMore) return;
                if (loadingMore) return;
                if (!canLoadMoreRef.current) return;
                canLoadMoreRef.current = false;
                onEndReached();
            }}
            ListFooterComponent={() => (hasMore || loadingMore ? <ListFooterSpinner loading /> : null)}
            refreshControl={refreshControl}
            ListEmptyComponent={ListEmptyComponent as any}
        />
    );
};

export default PostList;





