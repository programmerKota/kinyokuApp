import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import uiStyles from '../ui/styles';
import { CommunityPost } from '../types';
import UserProfileWithRank from './UserProfileWithRank';
import { getContentStyle, CONTENT_LEFT_MARGIN, getBlockLeftMargin } from '../utils/nameUtils';
import { useProfile } from '../hooks/useProfile';
import RelativeTime from './RelativeTime';
import { getRankByDays } from '../services/rankService';

interface PostCardProps {
    post: CommunityPost;
    commentsCount?: number;
    // new: id-based stable handlers (preferred)
    postId?: string;
    onLikeId?: (postId: string) => void;
    onCommentId?: (postId: string) => void;
    onReplyId?: (postId: string) => void;
    onUserPressId?: (userId: string, userName: string) => void;
    // legacy props (kept for backward compatibility)
    onPress?: () => void;
    onLike?: () => void;
    onComment?: () => void;
    onReply?: () => void;
    onUserPress?: (userId: string, userName: string) => void;
    isLiked?: boolean;
    showReplyButton?: boolean;
    authorAverageDays?: number;
}

// 共通の左マージン値は nameUtils.ts からインポート

const PostCard: React.FC<PostCardProps> = ({
    post,
    postId,
    onLikeId,
    onCommentId,
    onReplyId,
    onUserPressId,
    onPress,
    onLike,
    onComment,
    onReply,
    onUserPress,
    isLiked = false,
    showReplyButton = false,
    authorAverageDays = 0,
    commentsCount,
}) => {
    const liveProfile = useProfile(post.authorId);
    const displayName = liveProfile?.displayName ?? post.authorName;
    const displayAvatar = liveProfile?.photoURL ?? post.authorAvatar;

    const handleProfilePress = useCallback(() => {
        if (onUserPressId) {
            onUserPressId(post.authorId, displayName);
            return;
        }
        onPress?.();
    }, [onUserPressId, post.authorId, displayName, onPress]);

    return (
        <View style={styles.container}>
            {/* メイン投稿 */}
            <View style={styles.postContent}>
                {/* モデレーション：ブロックは非表示 */}
                {post.moderation?.status === 'blocked' ? (
                    <Text style={styles.flaggedText}>ガイドライン違反のため非表示</Text>
                ) : null}
                <View style={[uiStyles.rowStart, styles.header]}> 
                    <UserProfileWithRank
                        userName={displayName}
                        userAvatar={displayAvatar}
                        averageDays={authorAverageDays}
                        onPress={handleProfilePress}
                        size="medium"
                        showRank={false}
                        showTitle={true}
                        title={getRankByDays(authorAverageDays).title}
                        style={styles.userProfileContainer}
                    />
                    <RelativeTime value={post.createdAt} style={uiStyles.timestampRight} />
                </View>

                {post.moderation?.status !== 'blocked' && (
                    <View style={[styles.content, { marginLeft: getBlockLeftMargin('medium') }]}>
                        {post.moderation?.status === 'flagged' || post.moderation?.status === 'pending' ? (
                            <Text style={styles.pendingText}>審査中のため本文を非表示</Text>
                        ) : (
                            <Text style={[styles.text, getContentStyle("medium")]}>
                                {post.content}
                            </Text>
                        )}
                        {post.imageUrl && (
                            <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
                        )}
                    </View>
                )}

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onLikeId ? () => onLikeId(postId ?? post.id) : onLike}
                    >
                        <Ionicons
                            name={isLiked ? 'heart' : 'heart-outline'}
                            size={18}
                            color={isLiked ? colors.error : colors.textSecondary}
                        />
                        <Text style={[styles.actionText, isLiked && styles.likedText]}>
                            {post.likes}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onCommentId ? () => onCommentId(postId ?? post.id) : onComment}
                    >
                        <Ionicons name="chatbubble-outline" size={18} color={colors.info} />
                        <Text style={[styles.actionText, { color: colors.info }]}>{commentsCount ?? post.comments}</Text>
                    </TouchableOpacity>
                </View>

                {/* 返信ボタン（条件付き表示） */}
                {showReplyButton && (
                    <View style={styles.replyButtonContainer}>
                        <View style={styles.replyButtonSpacer} />
                        <TouchableOpacity
                            style={styles.replyButton}
                            onPress={onReplyId ? () => onReplyId(postId ?? post.id) : onReply}
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
    text: {
        // 共通関数でスタイルを管理するため、基本スタイルのみ
    },
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
        marginLeft: getBlockLeftMargin('medium') as any,
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
        fontWeight: typography.fontWeight.medium as any,
    },
    likedText: {
        color: colors.error,
    },
    flaggedText: {
        color: colors.error,
        fontSize: typography.fontSize.sm,
        marginBottom: spacing.sm,
        marginLeft: getBlockLeftMargin('medium') as any,
    },
    pendingText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
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
        fontWeight: typography.fontWeight.medium as any,
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

export default React.memo(PostCard);
