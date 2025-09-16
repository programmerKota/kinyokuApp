import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    ScrollView,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { colors, spacing, typography, shadows } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { RankingService, UserRanking } from '../services/rankingService';
import { RankingBatchService } from '../services/rankingBatchService';
import { StatsService } from '../services/statsService';
import UserProfileWithRank from '../components/UserProfileWithRank';
import { useProfile } from '../hooks/useProfile';
import { navigateToUserDetail } from '../utils';
import { getRankByDays } from '../services/rankService';

const RankingScreen: React.FC = () => {
    const { user } = useAuth();
    const navigation = useNavigation<NavigationProp<any>>();
    const [rankings, setRankings] = useState<UserRanking[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    // ランキングデータを取得
    useEffect(() => {
        fetchRankings();
    }, []);

    const fetchRankings = async () => {
        try {
            // まずキャッシュされたランキングを取得
            let rankingsData = await RankingBatchService.getCachedRankings();

            // キャッシュが空または古い場合はリアルタイムで取得
            if (rankingsData.length === 0 || await RankingBatchService.shouldUpdateRankings()) {
                console.log('キャッシュが古いため、リアルタイムでランキングを取得');
                rankingsData = await RankingService.getUserRankings();

                // バックグラウンドでキャッシュを更新
                RankingBatchService.updateRankings().catch(error => {
                    console.error('ランキングキャッシュ更新エラー:', error);
                });
            }

            setRankings(rankingsData);
        } catch (error) {
            console.error('ランキング取得エラー:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchRankings();
        setRefreshing(false);
    };

    // 現在のユーザーの順位を取得
    const getCurrentUserRank = () => {
        if (!user || rankings.length === 0) return null;
        const currentUserRanking = rankings.find(ranking => ranking.id === user.uid);
        return currentUserRanking ? currentUserRanking.rank : null;
    };


    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return 'trophy';
            case 2:
                return 'medal';
            case 3:
                return 'medal-outline';
            default:
                return 'person';
        }
    };

    const getRankColor = (rank: number) => {
        switch (rank) {
            case 1:
                return colors.warning;
            case 2:
                return colors.textSecondary;
            case 3:
                return colors.textTertiary;
            default:
                return colors.textPrimary;
        }
    };

    const handleUserPress = (userId: string, userName: string, userAvatar?: string) => {
        navigateToUserDetail(navigation, userId, userName, userAvatar);
    };

    const RankingListItem: React.FC<{ item: UserRanking }> = ({ item }) => {
        const isCurrentUser = user?.uid === item.id;
        const live = useProfile(item.id);
        const displayName = live?.displayName ?? item.name;
        const displayAvatar = live?.photoURL ?? item.avatar;

        return (
            <View style={[styles.rankingItem, isCurrentUser && styles.currentUserItem]}>
                {isCurrentUser && (
                    <View style={styles.youBadgeContainer}>
                        <Text style={styles.youBadgeText}>You</Text>
                    </View>
                )}
                <View style={styles.rankContainer}>
                    <Ionicons name={getRankIcon(item.rank) as any} size={24} color={getRankColor(item.rank)} />
                    <Text style={[styles.rankNumber, { color: getRankColor(item.rank) }]}>{item.rank}</Text>
                </View>

                <UserProfileWithRank
                    userName={displayName}
                    userAvatar={displayAvatar}
                    averageDays={item.averageTime / (24 * 60 * 60)}
                    onPress={() => handleUserPress(item.id, displayName, displayAvatar)}
                    size="medium"
                    showRank={false}
                    showTitle={true}
                    title={getRankByDays(item.averageTime / (24 * 60 * 60)).title}
                    showAverageTime={true}
                    style={styles.userProfileContainer}
                    textStyle={isCurrentUser ? styles.currentUserName : styles.userName}
                />
            </View>
        );
    };

    const renderRankingItem = ({ item }: { item: UserRanking }) => <RankingListItem item={item} />;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>ランキング</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={styles.descriptionCard}>
                    <View style={styles.descriptionHeader}>
                        <Ionicons name="trophy" size={24} color={colors.warning} />
                        <Text style={styles.descriptionTitle}>ランキング</Text>
                    </View>
                    <Text style={styles.descriptionText}>
                        平均継続時間でランキングしています。
                    </Text>
                    {(() => {
                        const currentUserRank = getCurrentUserRank();
                        if (currentUserRank) {
                            return (
                                <Text style={styles.currentUserRank}>
                                    あなたの順位: {rankings.length}人中{currentUserRank}位
                                </Text>
                            );
                        } else {
                            return (
                                <Text style={styles.participantCount}>
                                    参加者: {rankings.length}人
                                </Text>
                            );
                        }
                    })()}
                </View>

                {rankings.length > 0 ? (
                    <FlatList
                        data={rankings}
                        renderItem={renderRankingItem}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="trophy-outline" size={64} color={colors.textTertiary} />
                        <Text style={styles.emptyTitle}>ランキングデータがありません</Text>
                        <Text style={styles.emptyText}>
                            チャレンジを完了したユーザーがいるとランキングが表示されます
                        </Text>
                    </View>
                )}
            </ScrollView>
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
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        backgroundColor: colors.backgroundPrimary,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderPrimary,
    },
    backButton: {
        padding: spacing.sm,
    },
    title: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.bold as any,
        color: colors.textPrimary,
        textAlign: 'center',
        flex: 1,
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    descriptionCard: {
        backgroundColor: colors.warningLight,
        margin: spacing.xl,
        borderRadius: 16,
        padding: spacing.xl,
    },
    descriptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    descriptionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold as any,
        color: colors.textPrimary,
        marginLeft: spacing.sm,
    },
    descriptionText: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        lineHeight: typography.lineHeight.normal * typography.fontSize.sm,
    },
    participantCount: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
        fontWeight: typography.fontWeight.medium as any,
    },
    currentUserRank: {
        fontSize: typography.fontSize.sm,
        color: colors.textPrimary,
        marginTop: spacing.xs,
        fontWeight: typography.fontWeight.bold as any,
    },
    rankingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        marginHorizontal: spacing.xl,
        marginVertical: spacing.xs,
        padding: spacing.lg,
        borderRadius: 12,
        ...shadows.sm,
        position: 'relative',
    },
    currentUserItem: {
        backgroundColor: colors.white,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    youBadgeContainer: {
        position: 'absolute',
        top: -12,
        left: -6,
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        zIndex: 2,
    },
    youBadgeText: {
        color: colors.white,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold as any,
    },
    rankContainer: {
        alignItems: 'center',
        marginRight: spacing.lg,
        minWidth: 40,
    },
    userProfileContainer: {
        marginRight: spacing.md,
    },
    rankNumber: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold as any,
        marginTop: spacing.xs,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold as any,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    currentUserName: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold as any,
    },
    currentUserText: {
        color: colors.textPrimary,
    },
    averageTimeContainer: {
        marginBottom: spacing.xs,
    },
    averageTime: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.medium as any,
    },
    averageTimeSub: {
        fontSize: typography.fontSize.sm,
        color: colors.textTertiary,
        marginTop: 2,
        fontWeight: typography.fontWeight.medium as any,
    },
    stats: {
        fontSize: typography.fontSize.xs,
        color: colors.textTertiary,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['4xl'],
        paddingHorizontal: spacing.xl,
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
        lineHeight: typography.lineHeight.normal * typography.fontSize.sm,
    },
});

export default RankingScreen;
