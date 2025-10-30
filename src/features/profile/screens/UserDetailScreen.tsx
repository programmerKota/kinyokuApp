import { Ionicons } from "@expo/vector-icons";
import type { RouteProp } from "@react-navigation/native";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@app/contexts/AuthContext";
import {
  DiaryService,
  FollowService,
  BlockService,
} from "@core/services/firestore";
import type { FirestoreDiary } from "@core/services/firestore/types";
import { getRankDisplayByDays } from "@core/services/rankService";
import { UserStatsService } from "@core/services/userStatsService";
import DiaryCard from "@features/diary/components/DiaryCard";
import { useAuthPrompt } from "@shared/auth/AuthPromptProvider";
import AvatarImage from "@shared/components/AvatarImage";
import { useDisplayProfile } from "@shared/hooks/useDisplayProfile";
import { BlockStore } from "@shared/state/blockStore";
import { FollowStore } from "@shared/state/followStore";
import {
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
} from "@shared/theme";
import AppStatusBar from "@shared/theme/AppStatusBar";
import { colorSchemes, type ColorPalette } from "@shared/theme/colors";
import { createUiStyles } from "@shared/ui/styles";
import { toDate, type DateLike } from "@shared/utils/date";
import { navigateToUserDetail } from "@shared/utils/navigation";

type RootStackParamList = {
  UserDetail: { userId: string; userName?: string; userAvatar?: string };
};

type UserDetailRouteProp = RouteProp<RootStackParamList, "UserDetail">;

type DiaryEntry = FirestoreDiary & {
  createdAt: Date;
  updatedAt: Date;
};

const UserDetailScreen: React.FC = () => {
  const route = useRoute<UserDetailRouteProp>();
  const navigation =
    useNavigation<
      import("@react-navigation/stack").StackNavigationProp<
        import("@app/navigation/RootNavigator").RootStackParamList
      >
    >();
  const { userId, userName, userAvatar } = route.params;
  const { user } = useAuth();
  const { mode } = useAppTheme();
  const colors = React.useMemo(() => colorSchemes[mode], [mode]);
  const uiStyles = useThemedStyles(createUiStyles);
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { name: liveName, avatar: liveAvatar } = useDisplayProfile(
    userId,
    userName,
    userAvatar,
  );

  const [name, setName] = useState<string>(liveName || "ユーザー");
  const [avatar, setAvatar] = useState<string | undefined>(liveAvatar);
  const [following, setFollowing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [averageDays, setAverageDays] = useState(0);
  const currentDayLabel = React.useMemo(() => {
    if (Number.isNaN(averageDays)) return null;
    const normalizedDay = Math.trunc(averageDays);
    if (normalizedDay <= 0) return null;
    return `今${normalizedDay}日目だよね`;
  }, [averageDays]);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { requireAuth } = useAuthPrompt();

  useEffect(() => {
    setName(liveName || "ユーザー");
    setAvatar(liveAvatar);
  }, [liveName, liveAvatar]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const days = await UserStatsService.getUserCurrentDaysForRank(userId).catch(
        () => 0,
      );
      setAverageDays(days);
    })();
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const isFollowing = await FollowService.isFollowing(userId);
        if (mounted) setFollowing(isFollowing);
      } catch {}
      try {
        const isBlocked = await BlockService.isBlocked(userId);
        if (mounted) setBlocked(isBlocked);
      } catch {}
      try {
        const counts = await FollowService.getCounts(userId);
        if (mounted) {
          setFollowingCount(counts.following);
          setFollowersCount(counts.followers);
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const days = await UserStatsService.getUserCurrentDaysForRank(userId);
          if (mounted) setAverageDays(days);
        } catch {}
        try {
          const counts = await FollowService.getCounts(userId);
          if (mounted) {
            setFollowingCount(counts.following);
            setFollowersCount(counts.followers);
          }
        } catch {}
      })();
      return () => {
        mounted = false;
      };
    }, [userId]),
  );

  const loadDiaries = useCallback(async (): Promise<DiaryEntry[]> => {
    if (!userId) return [];
    const list = await DiaryService.getUserDiaries(userId);
    return list
      .map((entry) => ({
        ...entry,
        createdAt: toDate(entry.createdAt as DateLike),
        updatedAt: toDate(entry.updatedAt as DateLike),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setDiaryLoading(true);
      try {
        const normalized = await loadDiaries();
        if (mounted) setDiaries(normalized);
      } catch (e) {
        console.warn("UserDetailScreen.loadDiaries failed", e);
        if (mounted) setDiaries([]);
      } finally {
        if (mounted) setDiaryLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadDiaries]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const normalized = await loadDiaries();
      setDiaries(normalized);
    } catch (e) {
      console.warn("UserDetailScreen.refreshDiaries failed", e);
    } finally {
      setRefreshing(false);
    }
  }, [loadDiaries]);

  const handleAuthorPress = useCallback(
    (uid: string, uname?: string) => {
      navigateToUserDetail(navigation, uid, uname);
    },
    [navigation],
  );

  const renderDiaryItem = useCallback(
    ({ item }: { item: DiaryEntry }) => (
      <View style={styles.diaryItem}>
        <DiaryCard
          authorId={item.userId}
          authorName={name}
          authorAvatar={avatar}
          averageDays={item.day ?? averageDays}
          day={item.day}
          content={item.content}
          createdAt={item.createdAt}
          onAuthorPress={handleAuthorPress}
        />
      </View>
    ),
    [averageDays, avatar, handleAuthorPress, name],
  );

  const keyExtractor = useCallback((item: DiaryEntry) => item.id, []);

  const diaryCount = diaries.length;

  const onToggleFollow = useCallback(async () => {
    try {
      const ok = await requireAuth();
      if (!ok) return;
      if (following) {
        FollowStore.remove(userId);
        await FollowService.unfollow(userId);
        setFollowing(false);
        setFollowersCount((n) => Math.max(0, n - 1));
      } else {
        FollowStore.add(userId);
        await FollowService.follow(userId);
        setFollowing(true);
        setFollowersCount((n) => n + 1);
      }
    } catch (e) {
      console.warn("follow toggle failed", e);
    }
  }, [following, requireAuth, userId]);

  const onToggleBlock = useCallback(async () => {
    try {
      const ok = await requireAuth();
      if (!ok) return;
      const wasFollowing = following;
      if (blocked) {
        BlockStore.remove(userId);
        await BlockService.unblock(userId);
        setBlocked(false);
      } else {
        BlockStore.add(userId);
        await BlockService.block(userId);
        setBlocked(true);
        setFollowing(false);
        try {
          FollowStore.remove(userId);
        } catch {}
        if (wasFollowing) {
          setFollowersCount((n) => Math.max(0, n - 1));
        }
      }
    } catch (e) {
      console.warn("block toggle failed", e);
    }
  }, [blocked, following, requireAuth, userId]);

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBar />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プロフィール</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <FlatList
        data={diaries}
        keyExtractor={keyExtractor}
        renderItem={renderDiaryItem}
        contentContainerStyle={[
          uiStyles.listContainer,
          styles.listContent,
          diaryCount === 0 ? styles.emptyContainer : null,
        ]}
        ListHeaderComponent={
          <View>
            <View style={styles.profileHeaderCenter}>
              <AvatarImage uri={avatar} size={88} style={styles.profileAvatar} />
              <Text style={styles.profileName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.profileRank} numberOfLines={1}>
                {getRankDisplayByDays(averageDays)}
              </Text>
              {currentDayLabel && (
                <Text style={styles.profileDay} numberOfLines={1}>
                  {currentDayLabel}
                </Text>
              )}
            </View>

            {user?.uid !== userId && (
              <View style={styles.ctaRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onToggleFollow}
                  style={[
                    styles.primaryCta,
                    following && styles.primaryCtaActive,
                  ]}
                >
                  <Ionicons
                    name={following ? "checkmark" : "person-add-outline"}
                    size={18}
                    color={colors.black}
                    style={styles.ctaIcon}
                  />
                  <Text style={styles.primaryCtaText}>
                    {following ? "フォロー中" : "フォロー"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onToggleBlock}
                  style={[styles.ghostCta, blocked && styles.ghostCtaActive]}
                >
                  <Ionicons
                    name={blocked ? "close-circle" : "remove-circle-outline"}
                    size={18}
                    color={blocked ? colors.gray800 : colors.textSecondary}
                    style={styles.ctaIcon}
                  />
                  <Text
                    style={[
                      styles.ghostCtaText,
                      blocked && styles.ghostCtaTextActive,
                    ]}
                  >
                    {blocked ? "ブロック中" : "ブロック"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{diaryCount}</Text>
                <Text style={styles.statLabel}>日記</Text>
              </View>
              <View style={styles.statDivider} />
              <TouchableOpacity
                style={styles.statItem}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate("FollowList", {
                    userId,
                    userName: name,
                    mode: "following",
                  })
                }
              >
                <Text style={styles.statNumber}>{followingCount}</Text>
                <Text style={styles.statLabel}>フォロー</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <TouchableOpacity
                style={styles.statItem}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate("FollowList", {
                    userId,
                    userName: name,
                    mode: "followers",
                  })
                }
              >
                <Text style={styles.statNumber}>{followersCount}</Text>
                <Text style={styles.statLabel}>フォロワー</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {diaryLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.emptyText}>まだ日記はありません</Text>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundTertiary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    backButton: { padding: spacing.sm },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: typography.fontSize.lg,
      fontWeight: "bold",
      color: colors.gray800,
    },
    headerPlaceholder: {
      width: 32,
    },
    listContent: {
      backgroundColor: colors.backgroundSecondary,
      paddingBottom: spacing["4xl"],
    },
    emptyContainer: {
      flexGrow: 1,
    },
    empty: {
      paddingVertical: spacing["3xl"],
      alignItems: "center",
    },
    emptyText: {
      color: colors.textSecondary,
    },
    profileHeaderCenter: {
      alignItems: "center",
      paddingHorizontal: spacing.xl,
      paddingTop: spacing["2xl"],
      paddingBottom: spacing.lg,
      backgroundColor: colors.backgroundSecondary,
    },
    profileAvatar: {
      marginBottom: spacing.md,
    },
    profileName: {
      fontSize: typography.fontSize.lg,
      fontWeight: "700",
      color: colors.gray800,
    },
    profileRank: {
      marginTop: 4,
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    profileDay: {
      marginTop: 4,
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    ctaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
      backgroundColor: colors.backgroundSecondary,
    },
    primaryCta: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FACC15",
      borderRadius: 28,
      paddingVertical: 10,
    },
    primaryCtaActive: {
      backgroundColor: "#FDE047",
    },
    primaryCtaText: {
      color: colors.black,
      fontSize: typography.fontSize.base,
      fontWeight: "700",
    },
    ghostCta: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      borderRadius: 28,
      paddingVertical: 10,
    },
    ghostCtaActive: {
      backgroundColor: "#E5E7EB",
      borderColor: "#CBD5E1",
    },
    ghostCtaText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.base,
      fontWeight: "700",
    },
    ghostCtaTextActive: {
      color: colors.gray800,
    },
    ctaIcon: {
      marginRight: 8,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      backgroundColor: colors.backgroundSecondary,
      borderTopWidth: 1,
      borderTopColor: colors.borderPrimary,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    statItem: {
      flex: 1,
      alignItems: "center",
    },
    statNumber: {
      fontSize: typography.fontSize.lg,
      fontWeight: "700",
      color: colors.gray800,
    },
    statLabel: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
    },
    statDivider: {
      width: 1,
      height: "60%",
      backgroundColor: colors.borderPrimary,
    },
    diaryItem: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
  });

export default UserDetailScreen;
