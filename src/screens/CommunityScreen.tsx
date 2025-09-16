import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows } from '../theme';
import uiStyles from '../ui/styles';
import { useAuth } from '../contexts/AuthContext';
import { CommunityPost } from '../types';
import { CommunityService, FollowService } from '../services/firestore';
import { navigateToUserDetail } from '../utils';
import PostCard from '../components/PostCard';
import { UserStatsService } from '../services/userStatsService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TournamentStackParamList } from '../navigation/TournamentStackNavigator';
import CreatePostModal from '../components/CreatePostModal';
import RepliesList from '../components/RepliesList';
import Button from '../components/Button';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';

type Nav = StackNavigationProp<TournamentStackParamList>;

type TabType = 'all' | 'my' | 'following';

const CommunityScreen: React.FC = () => {
    const navigation = useNavigation<Nav>();
    const { user } = useAuth();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [showReplyButtons, setShowReplyButtons] = useState<Set<string>>(new Set());
    const [replyCounts, setReplyCounts] = useState<Map<string, number>>(new Map());
    const [userAverageDays, setUserAverageDays] = useState<Map<string, number>>(new Map());
    // 相対時間は各セル内の RelativeTime コンポーネントで個別に更新する

    // いいね状態を初期化
    const initializeLikedPosts = async (posts: CommunityPost[]) => {
        if (!user) return;

        const likedPostIds = new Set<string>();
        for (const post of posts) {
            try {
                const isLiked = await CommunityService.isPostLikedByUser(post.id, user.uid);
                if (isLiked) {
                    likedPostIds.add(post.id);
                }
            } catch (error) {
                console.error('いいね状態の確認に失敗しました:', post.id, error);
            }
        }
        setLikedPosts(likedPostIds);
    };

    // ユーザーの平均日数を初期化
    const initializeUserAverageDays = async (posts: CommunityPost[]) => {
        const averageDaysMap = new Map<string, number>();

        // 重複するユーザーIDを取得
        const uniqueUserIds = new Set(posts.map(post => post.authorId));

        for (const userId of uniqueUserIds) {
            try {
                const averageDays = await UserStatsService.getUserAverageDaysForRank(userId);
                averageDaysMap.set(userId, averageDays);
            } catch (error) {
                console.error('ユーザーの平均日数取得に失敗:', userId, error);
                averageDaysMap.set(userId, 0);
            }
        }

        setUserAverageDays(averageDaysMap);
    };

    // 投稿データを正規化（いいね数が負の値にならないように）
    const normalizePosts = async (posts: CommunityPost[]): Promise<CommunityPost[]> => {
        const normalizedPosts = posts.map(post => ({
            ...post,
            likes: Math.max(0, post.likes || 0),
            comments: Math.max(0, post.comments || 0),
        }));

        // 各投稿の返信数を取得
        const counts = new Map<string, number>();
        for (const post of normalizedPosts) {
            try {
                const replies = await CommunityService.getPostReplies(post.id);
                counts.set(post.id, replies.length);
            } catch (error) {
                console.error(`投稿 ${post.id} の返信数取得に失敗:`, error);
                counts.set(post.id, 0);
            }
        }
        setReplyCounts(counts);

        return normalizedPosts;
    };

    // 既存配列とマージして、変化のない要素の参照を保つ（不要な再描画を防止）
    const mergePostsById = useCallback((prev: CommunityPost[], next: CommunityPost[]): CommunityPost[] => {
        const prevMap = new Map(prev.map(p => [p.id, p] as const));
        const result: CommunityPost[] = new Array(next.length);
        for (let i = 0; i < next.length; i++) {
            const n = next[i];
            const p = prevMap.get(n.id);
            if (p &&
                p.authorId === n.authorId &&
                p.authorName === n.authorName &&
                p.authorAvatar === n.authorAvatar &&
                p.content === n.content &&
                p.likes === n.likes &&
                p.comments === n.comments &&
                String(p.createdAt) === String(n.createdAt) &&
                String(p.updatedAt) === String(n.updatedAt)
            ) {
                result[i] = p; // keep reference
            } else {
                result[i] = n;
            }
        }
        return result;
    }, []);

    // アクティブタブに応じて投稿を取得
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const loadPosts = async () => {
            switch (activeTab) {
                case 'all':
                    unsubscribe = CommunityService.subscribeToRecentPosts(async (list) => {
                        const normalizedPosts = await normalizePosts(list as any);
                        setPosts(prev => mergePostsById(prev, normalizedPosts));
                        // いいね状態を初期化
                        initializeLikedPosts(normalizedPosts);
                        // ユーザーの平均日数を初期化
                        initializeUserAverageDays(normalizedPosts);
                    });
                    break;
                case 'my':
                    if (user) {
                        unsubscribe = CommunityService.subscribeToUserPosts(user.uid, async (list) => {
                            const normalizedPosts = await normalizePosts(list as any);
                            setPosts(prev => mergePostsById(prev, normalizedPosts));
                            // いいね状態を初期化
                            initializeLikedPosts(normalizedPosts);
                            // ユーザーの平均日数を初期化
                            initializeUserAverageDays(normalizedPosts);
                        });
                    }
                    break;
                case 'following':
                    if (user && followingUsers.size > 0) {
                        unsubscribe = CommunityService.subscribeToFollowingPosts(
                            Array.from(followingUsers),
                            async (list) => {
                                const normalizedPosts = await normalizePosts(list as any);
                                setPosts(prev => mergePostsById(prev, normalizedPosts));
                                // いいね状態を初期化
                                initializeLikedPosts(normalizedPosts);
                                // ユーザーの平均日数を初期化
                                initializeUserAverageDays(normalizedPosts);
                            }
                        );
                    } else {
                        setPosts([]);
                    }
                    break;
            }
        };

        loadPosts();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [activeTab, user, followingUsers]);

    // フォロー中のユーザーを取得
    useEffect(() => {
        if (user) {
            const unsubscribe = FollowService.subscribeToFollowingUserIds(user.uid, (userIds) => {
                setFollowingUsers(new Set(userIds));
            });
            return unsubscribe;
        }
    }, [user]);

    const handleRefresh = async () => {
        setRefreshing(true);
        // onSnapshot購読のため手動リフレッシュは即解除
        setRefreshing(false);
    };

    const handleCreatePost = async (postData: { content: string }) => {
        try {
            await CommunityService.addPost(postData);
            // 再読み込み
            if (user) {
                const list = await CommunityService.getUserPosts(user.uid);
                setPosts(list as any);
            }
        } catch (e) {
            console.warn('Failed to add post', e);
        }
    };

    const handleLike = useCallback(async (postId: string) => {
        try {
            const isLiked = await CommunityService.toggleLike(postId);
            console.log('いいね:', postId, isLiked ? '追加' : '削除');

            // いいね状態を更新
            setLikedPosts(prev => {
                const newSet = new Set(prev);
                if (isLiked) {
                    newSet.add(postId);
                } else {
                    newSet.delete(postId);
                }
                return newSet;
            });

            // 投稿のいいね数を更新（楽観的更新）
            setPosts(prev => prev.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        likes: isLiked ? post.likes + 1 : Math.max(0, post.likes - 1),
                    };
                }
                return post;
            }));
        } catch (error) {
            console.error('いいねの切り替えに失敗しました:', error);
            // エラーの場合は元に戻す
            setLikedPosts(prev => {
                const newSet = new Set(prev);
                newSet.delete(postId);
                return newSet;
            });
        }
    }, []);

    const handleComment = useCallback((postId: string) => {
        // 「返信を書く」ボタンの表示/非表示を切り替え
        setShowReplyButtons(prev => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) {
                newSet.delete(postId);
            } else {
                newSet.add(postId);
            }
            return newSet;
        });
    }, []);

    const handleReply = useCallback((postId: string) => {
        // 返信入力フィールドを表示
        setReplyingTo(postId);
        setReplyText('');
    }, []);

    const handleReplySubmit = async () => {
        if (!replyingTo || !replyText.trim()) return;

        try {
            await CommunityService.addReply(replyingTo, { content: replyText.trim() });
            console.log('返信を追加しました');

            // 返信数を更新
            setReplyCounts(prev => {
                const newCounts = new Map(prev);
                const currentCount = newCounts.get(replyingTo) || 0;
                newCounts.set(replyingTo, currentCount + 1);
                return newCounts;
            });

            setReplyingTo(null);
            setReplyText('');
        } catch (error) {
            console.error('返信の追加に失敗しました:', error);
        }
    };

    const handleReplyCancel = () => {
        setReplyingTo(null);
        setReplyText('');
    };

    const handlePostPress = useCallback((post: CommunityPost) => {
        navigateToUserDetail(navigation, post.authorId, post.authorName, post.authorAvatar);
    }, [navigation]);

    const handleTabPress = (tab: TabType) => {
        setActiveTab(tab);
    };

    // テスト用：既存の投稿者をフォロー
    const handleTestFollow = async () => {
        if (!user || posts.length === 0) return;

        // 既存の投稿から他のユーザーを探す
        const otherUsers = posts.filter(post => post.authorId !== user.uid);
        if (otherUsers.length === 0) {
            console.log('フォローできるユーザーがいません');
            return;
        }

        const targetUser = otherUsers[0]; // 最初の他のユーザーをフォロー

        try {
            await FollowService.followUser(user.uid, targetUser.authorId);
            console.log('フォローしました:', targetUser.authorName, targetUser.authorId);
        } catch (error) {
            console.error('フォローに失敗しました:', error);
        }
    };

    const renderPost = useCallback(({ item }: { item: CommunityPost }) => (
        <View>
            <PostCard
                post={item}
                postId={item.id}
                onLikeId={handleLike}
                onCommentId={handleComment}
                onReplyId={handleReply}
                onUserPressId={(userId, userName) => handlePostPress({ ...item, authorId: userId, authorName: userName })}
                isLiked={likedPosts.has(item.id)}
                showReplyButton={showReplyButtons.has(item.id)}
                authorAverageDays={userAverageDays.get(item.authorId) || 0}
                commentsCount={replyCounts.get(item.id) || 0}
            />
            {/* 返信一覧（トークアイコンを押したら表示） */}
            {showReplyButtons.has(item.id) && (
                <RepliesList
                    postId={item.id}
                    onUserPress={(userId, userName) => handlePostPress({ ...item, authorId: userId, authorName: userName })}
                />
            )}


        </View>
    ), [handleLike, handleComment, handleReply, likedPosts, showReplyButtons, userAverageDays, replyCounts, handlePostPress]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />

            {/* タブナビゲーション */}
            <View style={uiStyles.tabBar}>
                <TouchableOpacity
                    style={[uiStyles.tab, activeTab === 'all' && uiStyles.tabActive]}
                    onPress={() => handleTabPress('all')}
                >
                    <Text style={[uiStyles.tabText, activeTab === 'all' && uiStyles.tabTextActive]}>すべて</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[uiStyles.tab, activeTab === 'my' && uiStyles.tabActive]}
                    onPress={() => handleTabPress('my')}
                >
                    <Text style={[uiStyles.tabText, activeTab === 'my' && uiStyles.tabTextActive]}>My投稿</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[uiStyles.tab, activeTab === 'following' && uiStyles.tabActive]}
                    onPress={() => handleTabPress('following')}
                >
                    <Text style={[uiStyles.tabText, activeTab === 'following' && uiStyles.tabTextActive]}>フォロー</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView>
                <FlatList
                    data={posts}
                    renderItem={renderPost}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={uiStyles.listContainer}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubble-outline" size={64} color={colors.gray300} />
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'all' && '投稿がありません'}
                                {activeTab === 'my' && '自分の投稿がありません'}
                                {activeTab === 'following' && 'フォロー中の投稿がありません'}
                            </Text>
                            <Text style={styles.emptyText}>
                                {activeTab === 'all' && '最初の投稿を作成してみましょう'}
                                {activeTab === 'my' && 'まだ投稿していません'}
                                {activeTab === 'following' && 'フォローしているユーザーがいません'}
                            </Text>
                            {activeTab === 'all' && (
                                <Button
                                    title="投稿を作成"
                                    onPress={() => setShowCreateModal(true)}
                                    style={styles.emptyButton}
                                />
                            )}
                            {activeTab === 'following' && (
                                <Button
                                    title="投稿者をフォロー"
                                    onPress={handleTestFollow}
                                    style={styles.emptyButton}
                                />
                            )}
                        </View>
                    }
                />
            </KeyboardAwareScrollView>

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
                        <TouchableOpacity
                            onPress={handleReplyCancel}
                            style={styles.replyCancelButton}
                        >
                            <Text style={styles.replyCancelText}>キャンセル</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleReplySubmit}
                            style={[styles.replySubmitButton, !replyText.trim() && styles.replySubmitButtonDisabled]}
                            disabled={!replyText.trim()}
                        >
                            <Text style={[styles.replySubmitText, !replyText.trim() && styles.replySubmitTextDisabled]}>
                                返信
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* フローティングアクションボタン */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setShowCreateModal(true)}
            >
                <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>

            <CreatePostModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreatePost}
            />

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
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
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.bold as any,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        backgroundColor: colors.backgroundPrimary,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderPrimary,
    },
    tab: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        marginRight: spacing['3xl'],
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: colors.info,
    },
    tabText: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.medium as any,
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
        position: 'absolute',
        bottom: spacing.xl,
        right: spacing.xl,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.info,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.lg,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing['5xl'],
    },
    emptyTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold as any,
        color: colors.textSecondary,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: typography.fontSize.sm,
        color: colors.textTertiary,
        textAlign: 'center',
        marginBottom: spacing['2xl'],
    },
    emptyButton: {
        paddingHorizontal: spacing['3xl'],
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
        alignItems: 'center',
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
