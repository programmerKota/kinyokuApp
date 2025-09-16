import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, Image, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, shadows } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { FollowService, CommunityService, FirestoreCommunityPost } from '../services/firestore';
import UserProfileWithRank from '../components/UserProfileWithRank';
import { UserStatsService } from '../services/userStatsService';
import { getRankByDays } from '../services/rankService';
import PostCard from '../components/PostCard';
import RepliesList from '../components/RepliesList';
import { navigateToUserDetail } from '../utils';
import { formatRelative } from '../utils';

type RootStackParamList = {
    UserDetail: { userId: string; userName?: string; userAvatar?: string };
};

type UserDetailRouteProp = RouteProp<RootStackParamList, 'UserDetail'>;

const UserDetailScreen: React.FC = () => {
    const route = useRoute<UserDetailRouteProp>();
    const navigation = useNavigation();
    const { userId, userName, userAvatar } = route.params || ({} as any);
    const { user } = useAuth();
    const [name, setName] = useState<string>(userName || 'ユーザー');
    const [avatar, setAvatar] = useState<string | undefined>(userAvatar);
    const [following, setFollowing] = useState<boolean>(false);
    const [postsData, setPostsData] = useState<FirestoreCommunityPost[]>([]);
    const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
    const [showReplyButtons, setShowReplyButtons] = useState<Set<string>>(new Set());
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [replyCounts, setReplyCounts] = useState<Map<string, number>>(new Map());
    const [averageDays, setAverageDays] = useState(0);
    // 画面フォーカス中は毎秒再描画して相対時間を更新
    const [nowTick, setNowTick] = useState(0);

    useFocusEffect(
        useCallback(() => {
            const id = setInterval(() => setNowTick((t) => t + 1), 1000);
            return () => clearInterval(id);
        }, [])
    );

    useEffect(() => {
        setName((prev) => prev || 'ユーザー');
        // ユーザーの平均日数を取得
        if (userId) {
            UserStatsService.getUserAverageDaysForRank(userId).then(setAverageDays);
        }
    }, [userId]);


    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        let mounted = true;
        (async () => {
            try {
                const f = await FollowService.isFollowing(userId);
                if (mounted) setFollowing(f);
            } catch { }
            try {
                unsubscribe = CommunityService.subscribeToUserPosts(userId, async (list) => {
                    // 正規化（いいね数/コメント数の下限、返信数の取得）
                    const normalized = list.map(p => ({
                        ...p,
                        likes: Math.max(0, p.likes || 0),
                        comments: Math.max(0, p.comments || 0),
                    }));
                    const counts = new Map<string, number>();
                    for (const p of normalized) {
                        try {
                            const replies = await CommunityService.getPostReplies(p.id);
                            counts.set(p.id, replies.length);
                        } catch { counts.set(p.id, 0); }
                    }
                    setReplyCounts(counts);
                    setPostsData(normalized);
                    // いいね状態を初期化
                    if (user) {
                        const liked = new Set<string>();
                        for (const p of normalized) {
                            try {
                                const isLiked = await CommunityService.isPostLikedByUser(p.id, user.uid);
                                if (isLiked) liked.add(p.id);
                            } catch { }
                        }
                        setLikedPosts(liked);
                    }
                });
            } catch { }
        })();
        return () => { mounted = false; if (unsubscribe) unsubscribe(); };
    }, [userId, user]);

    const handlePostPress = (post: FirestoreCommunityPost) => {
        navigateToUserDetail(navigation, post.authorId, post.authorName, post.authorAvatar);
    };

    const handleLike = async (postId: string) => {
        try {
            const isLiked = await CommunityService.toggleLike(postId);
            setLikedPosts(prev => {
                const s = new Set(prev);
                if (isLiked) s.add(postId); else s.delete(postId);
                return s;
            });
            setPostsData(prev => prev.map(p => p.id === postId ? { ...p, likes: isLiked ? p.likes + 1 : Math.max(0, p.likes - 1) } : p));
        } catch (e) {
            console.warn('like toggle failed', e);
        }
    };

    const handleComment = (postId: string) => {
        setShowReplyButtons(prev => {
            const s = new Set(prev);
            if (s.has(postId)) s.delete(postId); else s.add(postId);
            return s;
        });
    };

    const handleReply = (postId: string) => {
        setReplyingTo(postId);
        setReplyText('');
    };

    const handleReplySubmit = async () => {
        if (!replyingTo || !replyText.trim()) return;
        try {
            await CommunityService.addReply(replyingTo, { content: replyText.trim() });
            setReplyCounts(prev => {
                const m = new Map(prev);
                m.set(replyingTo, (m.get(replyingTo) || 0) + 1);
                return m;
            });
            setReplyingTo(null);
            setReplyText('');
        } catch (e) {
            console.warn('reply failed', e);
        }
    };

    const handleReplyCancel = () => {
        setReplyingTo(null);
        setReplyText('');
    };

    const renderPost = ({ item }: { item: FirestoreCommunityPost }) => (
        <View>
            <PostCard
                post={{ ...item, comments: replyCounts.get(item.id) || 0 }}
                onPress={() => handlePostPress(item)}
                onLike={() => handleLike(item.id)}
                onComment={() => handleComment(item.id)}
                onReply={() => handleReply(item.id)}
                onUserPress={(userId, userName) => handlePostPress({ ...item, authorId: userId, authorName: userName })}
                isLiked={likedPosts.has(item.id)}
                showReplyButton={showReplyButtons.has(item.id)}
                authorAverageDays={averageDays}
            />
            {showReplyButtons.has(item.id) && (
                <RepliesList
                    postId={item.id}
                    onUserPress={(uid, uname) => handlePostPress({ ...item, authorId: uid, authorName: uname })}
                />
            )}
        </View>
    );

    const onToggleFollow = async () => {
        try {
            if (following) {
                await FollowService.unfollow(userId);
                setFollowing(false);
            } else {
                await FollowService.follow(userId);
                setFollowing(true);
            }
        } catch (e) {
            console.warn('follow toggle failed', e);
        }
    };

    // 相対時間は共通関数を使用

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color={colors.gray800} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>プロフィール</Text>
                <View style={{ width: 32 }} />
            </View>

            <FlatList
                data={postsData}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={
                    <View>
                        <View style={styles.profileTop}>
                            <UserProfileWithRank
                                userName={name}
                                userAvatar={avatar}
                                averageDays={averageDays}
                                size="medium"
                                showRank={false}
                                showTitle={true}
                                title={getRankByDays(averageDays).title}
                                style={styles.userProfileContainer}
                            />
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={onToggleFollow}
                                style={[styles.followBtn, following ? styles.following : styles.follow]}
                            >
                                <Text style={[styles.followText, following ? styles.followingText : styles.followText]}>
                                    {following ? 'フォロー中' : 'フォロー'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />
                    </View>
                }
                renderItem={renderPost}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>投稿がありません</Text></View>}
            />

            {/* 返信入力フィールド */}
            {replyingTo && (
                <View style={styles.replyInputContainer}>
                    <TextInput
                        style={styles.replyInput}
                        placeholder="返信を入力..."
                        placeholderTextColor={colors.textSecondary}
                        value={replyText}
                        onChangeText={setReplyText}
                        multiline
                        maxLength={280}
                        autoFocus
                    />
                    <View style={styles.replyInputActions}>
                        <TouchableOpacity onPress={handleReplyCancel} style={styles.replyCancelButton}>
                            <Text style={styles.replyCancelText}>キャンセル</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleReplySubmit}
                            style={[styles.replySubmitButton, !replyText.trim() && styles.replySubmitButtonDisabled]}
                            disabled={!replyText.trim()}
                        >
                            <Text style={[styles.replySubmitText, !replyText.trim() && styles.replySubmitTextDisabled]}>返信</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundTertiary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderPrimary,
    },
    backButton: { padding: spacing.sm },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: typography.fontSize.lg,
        fontWeight: 'bold',
        color: colors.gray800,
    },
    listContainer: {
        backgroundColor: colors.white,
    },
    empty: {
        paddingVertical: spacing['3xl'],
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textSecondary,
    },
    profileTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        backgroundColor: colors.white,
    },
    userProfileContainer: {
        flex: 1,
        marginRight: spacing.sm,
    },
    followBtn: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        minHeight: 32,
        borderColor: '#F87171',
        backgroundColor: colors.white,
    },
    followText: {
        color: '#F87171',
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
    },
    follow: {
        backgroundColor: colors.white,
    },
    following: {
        backgroundColor: '#FDE2E2',
    },
    followingText: {
        color: '#EF4444',
        fontWeight: '700',
    },
    divider: {
        height: 8,
        backgroundColor: colors.backgroundTertiary,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.borderPrimary,
    },
    postItem: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderPrimary,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    postAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: spacing.md },
    postAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    postAvatarInitial: { fontWeight: '700', color: colors.textSecondary },
    postAuthor: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.gray800 },
    postDot: { marginHorizontal: 6, color: colors.textSecondary },
    postTime: { fontSize: typography.fontSize.sm, color: colors.textSecondary },
    postContent: { fontSize: typography.fontSize.base, color: colors.textPrimary, lineHeight: 22, marginBottom: spacing.sm, marginLeft: 56 }, // アバター40px + マージン16px = 56px
    postActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 56 }, // アバター40px + マージン16px = 56px
    postAction: { flexDirection: 'row', alignItems: 'center', marginRight: spacing['3xl'] },
    postActionText: { marginLeft: 6, color: colors.textSecondary },
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
    replyCancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    replyCancelText: { fontSize: typography.fontSize.sm, color: colors.textSecondary, fontWeight: typography.fontWeight.medium as any },
    replySubmitButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 20, minWidth: 60, alignItems: 'center' },
    replySubmitButtonDisabled: { backgroundColor: colors.gray300 },
    replySubmitText: { fontSize: typography.fontSize.sm, color: colors.white, fontWeight: typography.fontWeight.semibold as any },
    replySubmitTextDisabled: { color: colors.gray500 },
});

export default UserDetailScreen;
