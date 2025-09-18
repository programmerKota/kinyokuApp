import React, { useCallback } from 'react';
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
    headerComponent?: React.ReactNode;
    refreshControl?: React.ReactElement<RefreshControlProps>;
    ListEmptyComponent?: React.ReactNode;
}

const PostList: React.FC<PostListProps> = ({
    posts,
    likedPosts,
    showReplyButtons,
    authorAverageDays,
    onLike,
    onComment,
    onReply,
    onUserPress,
    contentContainerStyle,
    listStyle,
    onEndReached,
    onEndReachedThreshold = 0.4,
    loadingMore = false,
    headerComponent,
    refreshControl,
    ListEmptyComponent,
}) => {
    const renderItem = useCallback(
        ({ item }: { item: CommunityPost }) => {
            const avgDays =
                typeof authorAverageDays === 'number'
                    ? authorAverageDays
                    : (authorAverageDays?.get?.(item.authorId) as number) || 0;
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
                        commentsCount={item.comments || 0}
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
        [likedPosts, showReplyButtons, authorAverageDays, onLike, onComment, onReply, onUserPress],
    );

    return (
        <FlatList
            style={listStyle}
            data={posts}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={contentContainerStyle}
            ListHeaderComponent={headerComponent as any}
            onEndReachedThreshold={onEndReached ? onEndReachedThreshold : undefined}
            onEndReached={onEndReached}
            ListFooterComponent={() => <ListFooterSpinner loading={!!loadingMore} />}
            refreshControl={refreshControl}
            ListEmptyComponent={ListEmptyComponent as any}
        />
    );
};

export default PostList;





