import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppStatusBar from "@shared/theme/AppStatusBar";

import { useAuth } from "@app/contexts/AuthContext";
import type { TournamentStackParamList } from "@app/navigation/TournamentStackNavigator";
import { RankingService } from "@core/services/rankingService";
import type { UserRanking } from "@core/services/rankingService";
import { UserStatsService } from "@core/services/userStatsService";
import RankingListItem from "@features/ranking/components/RankingListItem";
import { navigateToUserDetail } from "@shared/utils/navigation";
import { useFollowingIds } from "@shared/state/followStore";
import { useThemedStyles, useAppTheme, spacing, typography, shadows } from "@shared/theme";
import ProfileCache, { type UserProfileLite } from "@core/services/profileCache";
import { createUiStyles } from "@shared/ui/styles";

const RankingScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation =
    useNavigation<StackNavigationProp<TournamentStackParamList>>();
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const uiStyles = useThemedStyles(createUiStyles);
  const styles = useMemo(() => createStyles(mode), [mode]);

  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<{ startedAt: string; userId: string } | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [avgDaysMap, setAvgDaysMap] = useState<Map<string, number>>(new Map());
  const [activeTab, setActiveTab] = useState<"all" | "following">("all");
  const [showTiers, setShowTiers] = useState(false);
  const followingIds = useFollowingIds();
  const [profilesMap, setProfilesMap] = useState<Map<string, UserProfileLite | undefined>>(new Map());

  useEffect(() => {
    void refreshRankings();
  }, [activeTab]);
  useEffect(() => {
    if (activeTab === "following") {
      void refreshRankings();
    }
  }, [followingIds, user?.uid, activeTab]);

  const PAGE_SIZE = 50;

  const refreshRankings = async () => {
    try {
      if (activeTab === "all") {
        const { items, nextCursor } = await RankingService.getUserRankingsPage(PAGE_SIZE);
        items.forEach((r, i) => (r.rank = i + 1));
        setRankings(items);
        setCursor(nextCursor);
        setHasMore(Boolean(nextCursor));
        const next = new Map<string, number>();
        items.forEach((r) => {
          const days = Math.floor((r.averageTime || 0) / (24 * 60 * 60));
          next.set(r.id, Math.max(0, days));
        });
        setAvgDaysMap(next);
      } else {
        const idsSet = new Set<string>(Array.from(followingIds));
        if (user?.uid) idsSet.add(user.uid);
        const ids = Array.from(idsSet);
        if (ids.length === 0) {
          setRankings([]);
          setCursor(undefined);
          setHasMore(false);
          setAvgDaysMap(new Map());
        } else {
          const list = await RankingService.getUserRankingsForUserIds(ids);
          list.forEach((r, i) => (r.rank = i + 1));
          setRankings(list);
          setCursor(undefined);
          setHasMore(false);
          const next = new Map<string, number>();
          list.forEach((r) => {
            const days = Math.floor((r.averageTime || 0) / (24 * 60 * 60));
            next.set(r.id, Math.max(0, days));
          });
          setAvgDaysMap(next);
        }
      }
    } catch {
      setRankings([]);
      setCursor(undefined);
      setHasMore(false);
      setAvgDaysMap(new Map());
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    if (activeTab !== "all") return;
    setLoadingMore(true);
    try {
      const { items, nextCursor } = await RankingService.getUserRankingsPage(PAGE_SIZE, cursor);
      const offset = rankings.length;
      items.forEach((r, i) => (r.rank = offset + i + 1));
      const mergedIds = new Set(rankings.map((r) => r.id));
      const dedup = [...rankings];
      for (const r of items) {
        if (!mergedIds.has(r.id)) dedup.push(r);
      }
      setRankings(dedup);
      setCursor(nextCursor);
      setHasMore(Boolean(nextCursor));
      setAvgDaysMap((prev) => {
        const next = new Map(prev);
        items.forEach((r) => {
          const days = Math.floor((r.averageTime || 0) / (24 * 60 * 60));
          next.set(r.id, Math.max(0, days));
        });
        return next;
      });
    } finally {
      setLoadingMore(false);
    }
  };

  // Prefetch and live-merge profiles for current list of ranking userIds
  useEffect(() => {
    const ids = Array.from(new Set(rankings.map((r) => r.id)));
    if (ids.length === 0) {
      setProfilesMap(new Map());
      return;
    }
    const unsub = ProfileCache.getInstance().subscribeMany(ids, (map) => {
      setProfilesMap(map);
    });
    return () => {
      try { unsub?.(); } catch { }
    };
  }, [rankings]);

  // Enrich rankings with live profile data so list renders stable values immediately
  const enrichedRankings = useMemo(() => {
    if (!rankings || rankings.length === 0) return rankings;
    return rankings.map((r) => {
      const p = profilesMap.get(r.id);
      // 繝励Ο繝輔ぅ繝ｼ繝ｫ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・縲悟炎髯､縺輔ｌ縺溘Θ繝ｼ繧ｶ繝ｼ縲阪→陦ｨ遉ｺ
      const hasProfile = profilesMap.has(r.id);
      return {
        ...r,
        name: (p?.displayName ?? (hasProfile ? r.name : 'ユーザー')) as any,
        avatar: (p?.photoURL ?? r.avatar) as any,
      } as UserRanking;
    });
  }, [rankings, profilesMap]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshRankings();
    setRefreshing(false);
  };

  const getCurrentUserRank = () => {
    if (!user || rankings.length === 0) return null;
    const currentUserRanking = rankings.find(
      (ranking) => ranking.id === user.uid,
    );
    return currentUserRanking ? currentUserRanking.rank : null;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "trophy";
      case 2:
        return "medal";
      case 3:
        return "medal-outline";
      default:
        return "person";
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "#F59E0B";
      case 2:
        return "#6B7280";
      case 3:
        return "#9CA3AF";
      default:
        return "#111827";
    }
  };

  const handleUserPress = (
    userId: string,
    userName: string,
    userAvatar?: string,
  ) => {
    navigateToUserDetail(navigation, userId, userName, userAvatar);
  };

  const onUserPress = useCallback(
    (userId: string, userName: string, userAvatar?: string) => {
      navigateToUserDetail(navigation, userId, userName, userAvatar);
    },
    [navigation],
  );

  const renderRankingItem = useCallback(
    ({ item }: { item: UserRanking }) => (
      <RankingListItem
        item={item}
        avgDays={avgDaysMap.get(item.id) ?? 0}
        currentUserId={user?.uid}
        onPress={onUserPress}
      />
    ),
    [avgDaysMap, user?.uid, onUserPress],
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBar />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>ランキング</Text>
        <View style={styles.placeholder} />
      </View>

      {/* 繧ｿ繝門・繧頑崛縺・*/}
      <View style={uiStyles.tabBar}>
        <TouchableOpacity
          style={[uiStyles.tab, activeTab === "all" && uiStyles.tabActive]}
          onPress={() => {
            if (activeTab !== "all") setActiveTab("all");
          }}
        >
          <Text style={[uiStyles.tabText, activeTab === "all" && uiStyles.tabTextActive]}>すべて</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[uiStyles.tab, activeTab === "following" && uiStyles.tabActive]}
          onPress={() => {
            if (activeTab !== "following") setActiveTab("following");
          }}
        >
          <Text style={[uiStyles.tabText, activeTab === "following" && uiStyles.tabTextActive]}>フォロー中</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.content}
        data={enrichedRankings}
        renderItem={renderRankingItem}
        keyExtractor={(item) => item.id}
        onEndReachedThreshold={0.5}
        onEndReached={() => { void loadMore(); }}
        removeClippedSubviews
        windowSize={5}
        maxToRenderPerBatch={24}
        initialNumToRender={12}
        showsVerticalScrollIndicator={false}
        extraData={{ pv: profilesMap, avg: avgDaysMap }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
            colors={["#2563EB"]}
            tintColor={"#2563EB"}
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ padding: 16, alignItems: "center" }}>
              <Text style={{ color: "#6B7280" }}>読み込み中...</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.descriptionCard}>
            <View style={styles.descriptionHeader}>
              <Ionicons name="trophy" size={24} color={colors.warning} />
              <Text style={styles.descriptionTitle}>ランキング</Text>
              <TouchableOpacity
                onPress={() => setShowTiers((v) => !v)}
                style={{ marginLeft: 'auto' }}
              >
                <Text style={{ color: '#2563EB', fontWeight: '600' }}>
                  {showTiers ? '詳細を隠す' : '詳細を表示'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.descriptionText}>
              現在の継続時間でランキングしています。
            </Text>
            {showTiers && (
              <View style={styles.tierCard}>
                <Text style={styles.tierTitle}>階級について</Text>
                <Text style={styles.tierText}>
                  禁欲の現在の継続日数（挑戦中の記録）に応じて階級（称号）が上がります。目安は以下の通りです。
                </Text>
                <ScrollView
                  style={styles.tierScrollView}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>訓練兵 🔰</Text>
                    <Text style={styles.tierRule}>
                      0日: 禁欲のスタート地点。まずは1日から始めましょう。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>二等兵 🔰⭐</Text>
                    <Text style={styles.tierRule}>
                      1日: 初回の達成。習慣化への第一歩です。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>一等兵 🔰⭐⭐</Text>
                    <Text style={styles.tierRule}>
                      2日: 少しずつ習慣が身についてきます。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>上等兵 🔰⭐⭐⭐</Text>
                    <Text style={styles.tierRule}>
                      3〜6日: 1週間を目指す段階。体調の変化を感じ始めます。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>兵長 🪙</Text>
                    <Text style={styles.tierRule}>
                      7〜13日: 1週間達成！安定期に入り、集中力が向上します。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>伍長 🛡️⭐</Text>
                    <Text style={styles.tierRule}>
                      14〜20日: 2週間を越えて、生活リズムが整ってきます。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>軍曹 🛡️⭐⭐</Text>
                    <Text style={styles.tierRule}>
                      21〜29日: 3週間達成。習慣が定着し、自信がついてきます。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>軍長 🛡️⭐⭐⭐</Text>
                    <Text style={styles.tierRule}>
                      30〜39日: 1ヶ月達成！体調と集中力の変化を強く実感します。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>准尉 🎗️</Text>
                    <Text style={styles.tierRule}>
                      40〜49日: 長期継続の段階。周囲にも良い影響を与え始めます。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>少尉 🎖️⭐</Text>
                    <Text style={styles.tierRule}>
                      50〜59日:
                      2ヶ月近く継続。意思決定がクリアになり、判断力が向上。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>中尉 🎖️⭐⭐</Text>
                    <Text style={styles.tierRule}>
                      60〜69日: 2ヶ月達成！反射的な衝動が弱まり、自制心が向上。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>大尉 🎖️⭐⭐⭐</Text>
                    <Text style={styles.tierRule}>
                      70〜99日: 3ヶ月近く継続。生活が整い、目標達成力が向上。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>少佐 🏆⭐</Text>
                    <Text style={styles.tierRule}>
                      100〜149日:
                      100日達成！継続の最強の証。ロールモデル的存在。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>中佐 🏆⭐⭐</Text>
                    <Text style={styles.tierRule}>
                      150〜199日: 5ヶ月継続。周囲の行動にも好影響を与える存在。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>大佐 🏆⭐⭐⭐</Text>
                    <Text style={styles.tierRule}>
                      200〜299日: 半年以上継続。継続力が人生のあらゆる面で活かされます。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>小将 🏵️⭐</Text>
                    <Text style={styles.tierRule}>
                      300〜399日: 10ヶ月継続。禁欲の達人として尊敬される存在。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>中将 🏵️⭐⭐</Text>
                    <Text style={styles.tierRule}>
                      400〜499日: 1年以上継続。継続の真の価値を理解した存在。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>大将 🏵️⭐⭐⭐</Text>
                    <Text style={styles.tierRule}>
                      500〜999日: 1年半以上継続。継続の神として崇められる存在。
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>ナポレオン 👑</Text>
                    <Text style={styles.tierRule}>
                      1000日以上
                      3年近く継続。伝説的な存在。継続の象徴として永遠に語り継がれる。
                    </Text>
                  </View>
                </ScrollView>
                <Text style={styles.tierNote}>
                  階級は「現在の継続日数（挑戦中の記録）」から算出されます。停止・失敗で継続日数はリセットされますが、次の挑戦で少しずつ押し上げましょう。
                </Text>
              </View>
            )}
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
                    参加者 {rankings.length}人
                  </Text>
                );
              }
            })()}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>ランキングデータがありません</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'following'
                ? 'No rankings from following users yet'
                : 'No rankings yet'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const createStyles = (mode: "light" | "dark") => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundTertiary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    backButton: {
      padding: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
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
      margin: 16,
      borderRadius: 16,
      padding: 16,
    },
    descriptionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    descriptionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textPrimary,
      marginLeft: 8,
    },
    descriptionText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 14 * 1.5,
    },
    tierCard: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      padding: 12,
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.warning,
      maxHeight: 400,
    },
    tierTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    tierText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 18,
    },
    tierScrollView: {
      maxHeight: 300,
    },
    tierItem: {
      marginBottom: 8,
    },
    tierBadge: {
      backgroundColor: colors.backgroundSecondary,
      color: colors.textPrimary,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 4,
      alignSelf: "flex-start",
    },
    tierRule: {
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 18,
      marginLeft: 4,
    },
    tierNote: {
      marginTop: 8,
      fontSize: 12,
      color: colors.textSecondary,
    },
    participantCount: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
      fontWeight: "500",
    },
    currentUserRank: {
      fontSize: 14,
      color: colors.textPrimary,
      marginTop: 4,
      fontWeight: "700",
    },
    rankingItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundSecondary,
      marginHorizontal: 16,
      marginVertical: 4,
      padding: 16,
      borderRadius: 12,
      shadowColor: colors.shadowLight,
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      position: "relative",
    },
    currentUserItem: {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    youBadgeContainer: {
      position: "absolute",
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
      fontSize: 12,
      fontWeight: "700",
    },
    rankContainer: {
      alignItems: "center",
      marginRight: 16,
      minWidth: 40,
    },
    userProfileContainer: {
      marginRight: 8,
    },
    rankNumber: {
      fontSize: 14,
      fontWeight: "700",
      marginTop: 4,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    currentUserName: {
      color: colors.textPrimary,
      fontWeight: "700",
    },
    currentUserText: {
      color: colors.textPrimary,
    },
    averageTimeContainer: {
      marginBottom: 4,
    },
    averageTime: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    averageTimeSub: {
      fontSize: 14,
      color: colors.textTertiary,
      marginTop: 2,
      fontWeight: "500",
    },
    stats: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 32,
      paddingHorizontal: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textSecondary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: "center",
      lineHeight: 14 * 1.5,
    },
  });
};

export default RankingScreen;


