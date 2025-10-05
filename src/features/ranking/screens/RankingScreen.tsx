import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import React, { useState, useEffect } from "react";
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
} from "react-native";

import { useAuth } from "@app/contexts/AuthContext";
import type { TournamentStackParamList } from "@app/navigation/TournamentStackNavigator";
import { RankingService } from "@core/services/rankingService";
import type { UserRanking } from "@core/services/rankingService";
import { UserStatsService } from "@core/services/userStatsService";
import UserProfileWithRank from "@shared/components/UserProfileWithRank";
import { useProfile } from "@shared/hooks/useProfile";
import { navigateToUserDetail } from "@shared/utils/navigation";

const RankingScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation =
    useNavigation<StackNavigationProp<TournamentStackParamList>>();
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<{ startedAt: string; userId: string } | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [avgDaysMap, setAvgDaysMap] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    void refreshRankings();
  }, []);

  const PAGE_SIZE = 50;

  const refreshRankings = async () => {
    try {
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
    } catch {
      setRankings([]);
      setCursor(undefined);
      setHasMore(false);
      setAvgDaysMap(new Map());
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
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

  const RankingListItem: React.FC<{ item: UserRanking }> = ({ item }) => {
    const isCurrentUser = user?.uid === item.id;
    const live = useProfile(item.id);
    const displayName = live?.displayName ?? item.name;
    const displayAvatar = live?.photoURL ?? item.avatar;

    return (
      <View
        style={[styles.rankingItem, isCurrentUser && styles.currentUserItem]}
      >
        {isCurrentUser && (
          <View style={styles.youBadgeContainer}>
            <Text style={styles.youBadgeText}>You</Text>
          </View>
        )}
        <View style={styles.rankContainer}>
          <Ionicons
            name={getRankIcon(item.rank) as any}
            size={24}
            color={getRankColor(item.rank)}
          />
          <Text style={[styles.rankNumber, { color: getRankColor(item.rank) }]}>
            {item.rank}
          </Text>
        </View>

        <UserProfileWithRank
          userName={displayName}
          userAvatar={displayAvatar}
          averageDays={avgDaysMap.get(item.id) ?? 0}
          averageSeconds={item.averageTime || 0}
          onPress={() => handleUserPress(item.id, displayName, displayAvatar)}
          size="small"
          showRank={false}
          showTitle={true}
          showAverageTime={true}
          style={styles.userProfileContainer}
          textStyle={isCurrentUser ? styles.currentUserName : styles.userName}
        />
      </View>
    );
  };

  const renderRankingItem = ({ item }: { item: UserRanking }) => (
    <RankingListItem item={item} />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={"#F5F5F7"} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={"#111827"} />
        </TouchableOpacity>
        <Text style={styles.title}>ランキング</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        style={styles.content}
        data={rankings}
        renderItem={renderRankingItem}
        keyExtractor={(item) => item.id}
        onEndReachedThreshold={0.5}
        onEndReached={() => { void loadMore(); }}
        removeClippedSubviews
        windowSize={5}
        maxToRenderPerBatch={24}
        initialNumToRender={12}
        showsVerticalScrollIndicator={false}
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
              <Ionicons name="trophy" size={24} color={"#F59E0B"} />
              <Text style={styles.descriptionTitle}>ランキング</Text>
            </View>
            <Text style={styles.descriptionText}>
              現在の継続時間でランキングしています。
            </Text>
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
                    14〜20日: 2週間を超えて、生活リズムが整ってきます。
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
                    70〜99日: 3ヶ月近く継続。生活が整い、目標達成能力が向上。
                  </Text>
                </View>
                <View style={styles.tierItem}>
                  <Text style={styles.tierBadge}>少佐 🏆⭐</Text>
                  <Text style={styles.tierRule}>
                    100〜149日:
                    100日達成！継続は最強の資産。ロールモデル的存在。
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
                    200〜299日:
                    半年以上継続。継続力が人生のあらゆる面で活かされます。
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
                    1000日以上:
                    3年近く継続。伝説的存在。継続の皇帝として永遠に語り継がれる。
                  </Text>
                </View>
              </ScrollView>
              <Text style={styles.tierNote}>
                階級は「現在の継続日数（挑戦中の記録）」から算出されます。停止・失敗で継続日数はリセットされますが、次の挑戦で少しずつ押し上げましょう。
              </Text>
            </View>
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
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color={"#9CA3AF"} />
            <Text style={styles.emptyTitle}>ランキングデータがありません</Text>
            <Text style={styles.emptyText}>
              チャレンジを完了したユーザーがいるとランキングが表示されます
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
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
    backgroundColor: "#FEF3C7",
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
    color: "#111827",
    marginLeft: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 14 * 1.5,
  },
  tierCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    maxHeight: 400,
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  tierText: {
    fontSize: 13,
    color: "#6B7280",
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
    backgroundColor: "#E0F2FE",
    color: "#0369A1",
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
    color: "#374151",
    lineHeight: 18,
    marginLeft: 4,
  },
  tierNote: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
  },
  participantCount: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "500",
  },
  currentUserRank: {
    fontSize: 14,
    color: "#111827",
    marginTop: 4,
    fontWeight: "700",
  },
  rankingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    position: "relative",
  },
  currentUserItem: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  youBadgeContainer: {
    position: "absolute",
    top: -12,
    left: -6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 2,
  },
  youBadgeText: {
    color: "#FFFFFF",
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
    color: "#111827",
    marginBottom: 4,
  },
  currentUserName: {
    color: "#111827",
    fontWeight: "700",
  },
  currentUserText: {
    color: "#111827",
  },
  averageTimeContainer: {
    marginBottom: 4,
  },
  averageTime: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  averageTimeSub: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "500",
  },
  stats: {
    fontSize: 12,
    color: "#9CA3AF",
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
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 14 * 1.5,
  },
});

export default RankingScreen;
