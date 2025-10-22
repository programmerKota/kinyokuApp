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
        name: (p?.displayName ?? (hasProfile ? r.name : '蜑企勁縺輔ｌ縺溘Θ繝ｼ繧ｶ繝ｼ')) as any,
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
        <Text style={styles.title}>繝ｩ繝ｳ繧ｭ繝ｳ繧ｰ</Text>
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
          <Text style={[uiStyles.tabText, activeTab === "all" && uiStyles.tabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[uiStyles.tab, activeTab === "following" && uiStyles.tabActive]}
          onPress={() => {
            if (activeTab !== "following") setActiveTab("following");
          }}
        >
          <Text style={[uiStyles.tabText, activeTab === "following" && uiStyles.tabTextActive]}>繝輔か繝ｭ繝ｼ</Text>
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
              <Text style={{ color: "#6B7280" }}>隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.descriptionCard}>
            <View style={styles.descriptionHeader}>
              <Ionicons name="trophy" size={24} color={colors.warning} />
              <Text style={styles.descriptionTitle}>繝ｩ繝ｳ繧ｭ繝ｳ繧ｰ</Text>
              <TouchableOpacity
                onPress={() => setShowTiers((v) => !v)}
                style={{ marginLeft: 'auto' }}
              >
                <Text style={{ color: '#2563EB', fontWeight: '600' }}>
                  {showTiers ? '隱ｬ譏弱ｒ髱櫁｡ｨ遉ｺ' : '隱ｬ譏弱ｒ陦ｨ遉ｺ'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.descriptionText}>
              迴ｾ蝨ｨ縺ｮ邯咏ｶ壽凾髢薙〒繝ｩ繝ｳ繧ｭ繝ｳ繧ｰ縺励※縺・∪縺吶・
            </Text>
            {showTiers && (
              <View style={styles.tierCard}>
                <Text style={styles.tierTitle}>髫守ｴ壹↓縺､縺・※</Text>
                <Text style={styles.tierText}>
                  遖∵ｬｲ縺ｮ迴ｾ蝨ｨ縺ｮ邯咏ｶ壽律謨ｰ・域倦謌ｦ荳ｭ縺ｮ險倬鹸・峨↓蠢懊§縺ｦ髫守ｴ夲ｼ育ｧｰ蜿ｷ・峨′荳翫′繧翫∪縺吶ら岼螳峨・莉･荳九・騾壹ｊ縺ｧ縺吶・
                </Text>
                <ScrollView
                  style={styles.tierScrollView}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>險鍋ｷｴ蜈ｵ 伐</Text>
                    <Text style={styles.tierRule}>
                      0譌･: 遖∵ｬｲ縺ｮ繧ｹ繧ｿ繝ｼ繝亥慍轤ｹ縲ゅ∪縺壹・1譌･縺九ｉ蟋九ａ縺ｾ縺励ｇ縺・・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 1</Text>
                    <Text style={styles.tierRule}>
                      1譌･: 蛻晏屓縺ｮ驕疲・縲らｿ呈・蛹悶∈縺ｮ隨ｬ荳豁ｩ縺ｧ縺吶・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 2</Text>
                    <Text style={styles.tierRule}>
                      2譌･: 蟆代＠縺壹▽鄙呈・縺瑚ｺｫ縺ｫ縺､縺・※縺阪∪縺吶・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 3</Text>
                    <Text style={styles.tierRule}>
                      3縲・譌･: 1騾ｱ髢薙ｒ逶ｮ謖・☆谿ｵ髫弱ゆｽ楢ｪｿ縺ｮ螟牙喧繧呈─縺伜ｧ九ａ縺ｾ縺吶・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 4</Text>
                    <Text style={styles.tierRule}>
                      7縲・3譌･: 1騾ｱ髢馴＃謌撰ｼ∝ｮ牙ｮ壽悄縺ｫ蜈･繧翫・寔荳ｭ蜉帙′蜷台ｸ翫＠縺ｾ縺吶・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 5</Text>
                    <Text style={styles.tierRule}>
                      14縲・0譌･: 2騾ｱ髢薙ｒ雜・∴縺ｦ縲∫函豢ｻ繝ｪ繧ｺ繝縺梧紛縺｣縺ｦ縺阪∪縺吶・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 6</Text>
                    <Text style={styles.tierRule}>
                      21縲・9譌･: 3騾ｱ髢馴＃謌舌らｿ呈・縺悟ｮ夂捩縺励∬・菫｡縺後▽縺・※縺阪∪縺吶・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 7</Text>
                    <Text style={styles.tierRule}>
                      30縲・9譌･: 1繝ｶ譛磯＃謌撰ｼ∽ｽ楢ｪｿ縺ｨ髮・ｸｭ蜉帙・螟牙喧繧貞ｼｷ縺丞ｮ滓─縺励∪縺吶・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 8</Text>
                    <Text style={styles.tierRule}>
                      40縲・9譌･: 髟ｷ譛溽ｶ咏ｶ壹・谿ｵ髫弱ょ捉蝗ｲ縺ｫ繧り憶縺・ｽｱ髻ｿ繧剃ｸ弱∴蟋九ａ縺ｾ縺吶・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 9</Text>
                    <Text style={styles.tierRule}>
                      50縲・9譌･:
                      2繝ｶ譛郁ｿ代￥邯咏ｶ壹よэ諤晄ｱｺ螳壹′繧ｯ繝ｪ繧｢縺ｫ縺ｪ繧翫∝愛譁ｭ蜉帙′蜷台ｸ翫・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 10</Text>
                    <Text style={styles.tierRule}>
                      60縲・9譌･: 2繝ｶ譛磯＃謌撰ｼ∝渚蟆・噪縺ｪ陦晏虚縺悟ｼｱ縺ｾ繧翫∬・蛻ｶ蠢・′蜷台ｸ翫・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 11</Text>
                    <Text style={styles.tierRule}>
                      70縲・9譌･: 3繝ｶ譛郁ｿ代￥邯咏ｶ壹ら函豢ｻ縺梧紛縺・∫岼讓咎＃謌占・蜉帙′蜷台ｸ翫・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 12</Text>
                    <Text style={styles.tierRule}>
                      100縲・49譌･:
                      100譌･驕疲・・∫ｶ咏ｶ壹・譛蠑ｷ縺ｮ雉・肇縲ゅΟ繝ｼ繝ｫ繝｢繝・Ν逧・ｭ伜惠縲・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 13</Text>
                    <Text style={styles.tierRule}>
                      150縲・99譌･: 5繝ｶ譛育ｶ咏ｶ壹ょ捉蝗ｲ縺ｮ陦悟虚縺ｫ繧ょ･ｽ蠖ｱ髻ｿ繧剃ｸ弱∴繧句ｭ伜惠縲・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 14</Text>
                    <Text style={styles.tierRule}>
                      200縲・99譌･:
                      蜊雁ｹｴ莉･荳顔ｶ咏ｶ壹らｶ咏ｶ壼鴨縺御ｺｺ逕溘・縺ゅｉ繧・ｋ髱｢縺ｧ豢ｻ縺九＆繧後∪縺吶・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 15</Text>
                    <Text style={styles.tierRule}>
                      300縲・99譌･: 10繝ｶ譛育ｶ咏ｶ壹らｦ∵ｬｲ縺ｮ驕比ｺｺ縺ｨ縺励※蟆頑噴縺輔ｌ繧句ｭ伜惠縲・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 16</Text>
                    <Text style={styles.tierRule}>
                      400縲・99譌･: 1蟷ｴ莉･荳顔ｶ咏ｶ壹らｶ咏ｶ壹・逵溘・萓｡蛟､繧堤炊隗｣縺励◆蟄伜惠縲・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>Tier 17</Text>
                    <Text style={styles.tierRule}>
                      500縲・99譌･: 1蟷ｴ蜊贋ｻ･荳顔ｶ咏ｶ壹らｶ咏ｶ壹・逾槭→縺励※蟠・ａ繧峨ｌ繧句ｭ伜惠縲・
                    </Text>
                  </View>
                  <View style={styles.tierItem}>
                    <Text style={styles.tierBadge}>繝翫・繝ｬ繧ｪ繝ｳ 荘</Text>
                    <Text style={styles.tierRule}>
                      1000譌･莉･荳・
                      3蟷ｴ霑代￥邯咏ｶ壹ゆｼ晁ｪｬ逧・ｭ伜惠縲らｶ咏ｶ壹・逧・ｸ昴→縺励※豌ｸ驕縺ｫ隱槭ｊ邯吶′繧後ｋ縲・
                    </Text>
                  </View>
                </ScrollView>
                <Text style={styles.tierNote}>
                  髫守ｴ壹・縲檎樟蝨ｨ縺ｮ邯咏ｶ壽律謨ｰ・域倦謌ｦ荳ｭ縺ｮ險倬鹸・峨阪°繧臥ｮ怜・縺輔ｌ縺ｾ縺吶ょ●豁｢繝ｻ螟ｱ謨励〒邯咏ｶ壽律謨ｰ縺ｯ繝ｪ繧ｻ繝・ヨ縺輔ｌ縺ｾ縺吶′縲∵ｬ｡縺ｮ謖第姶縺ｧ蟆代＠縺壹▽謚ｼ縺嶺ｸ翫￡縺ｾ縺励ｇ縺・・
                </Text>
              </View>
            )}
            {(() => {
              const currentUserRank = getCurrentUserRank();
              if (currentUserRank) {
                return (
                  <Text style={styles.currentUserRank}>
                    縺ゅ↑縺溘・鬆・ｽ・ {rankings.length}莠ｺ荳ｭ{currentUserRank}菴・
                  </Text>
                );
              } else {
                return (
                  <Text style={styles.participantCount}>
                    蜿ょ刈閠・ {rankings.length}莠ｺ
                  </Text>
                );
              }
            })()}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>繝ｩ繝ｳ繧ｭ繝ｳ繧ｰ繝・・繧ｿ縺後≠繧翫∪縺帙ｓ</Text>
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

