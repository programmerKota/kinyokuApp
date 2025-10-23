import { Ionicons } from "@expo/vector-icons";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppStatusBar from "@shared/theme/AppStatusBar";

import { FollowService } from "@core/services/firestore";
import ProfileCache from "@core/services/profileCache";
import AvatarImage from "@shared/components/AvatarImage";
import { spacing, typography, useAppTheme } from "@shared/theme";
import { navigateToUserDetail } from "@shared/utils/navigation";
import { getRankDisplayByDays } from "@core/services/rankService";
import { UserStatsService } from "@core/services/userStatsService";
import { useAuth } from "@app/contexts/AuthContext";
import { useAuthPrompt } from "@shared/auth/AuthPromptProvider";
import { FollowStore, useFollowingIds } from "@shared/state/followStore";

type ParamList = {
  FollowList: {
    userId: string;
    userName?: string;
    mode: "following" | "followers";
  };
};

type FollowListRouteProp = RouteProp<ParamList, "FollowList">;

const FollowListScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<FollowListRouteProp>();
  const { userId, userName, mode } = route.params || ({} as any);
  const { user } = useAuth();
  const followingSet = useFollowingIds();
  const { requireAuth } = useAuthPrompt();
  const { mode: themeMode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[themeMode], [themeMode]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const title = mode === "following" ? "フォロー" : "フォロワー";
  const [ids, setIds] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    let unsubProfiles: (() => void) | undefined;
    let unsubFollow: (() => void) | undefined;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;

    const attachProfiles = (list: string[]) => {
      setIds(list);
      if (unsubProfiles) unsubProfiles();
      unsubProfiles = ProfileCache.getInstance().subscribeMany(list, (map) => {
        setProfiles(map as any);
      });
    };

    const startPolling = () => {
      const tick = async () => {
        try {
          const list =
            mode === "following"
              ? await FollowService.getFollowingUserIds(userId)
              : await FollowService.getFollowerUserIds(userId);
          attachProfiles(list);
        } catch {
          // ignore
        } finally {
          pollTimer = setTimeout(tick, 5000);
        }
      };
      void tick();
    };

    if (mode === "following") {
      const fn: any = (FollowService as any).subscribeToFollowingUserIds;
      if (typeof fn === "function") {
        unsubFollow = fn(userId, attachProfiles);
      } else {
        startPolling();
      }
    } else {
      const fn: any = (FollowService as any).subscribeToFollowerUserIds;
      if (typeof fn === "function") {
        unsubFollow = fn(userId, attachProfiles);
      } else {
        startPolling();
      }
    }

    return () => {
      if (unsubProfiles) unsubProfiles();
      if (unsubFollow) unsubFollow();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [userId, mode]);

  const data = useMemo(() => ids, [ids]);

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBar />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(id) => id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item: id }) => {
          const p = profiles.get(id);
          const name = p?.displayName ?? "ユーザー";
          const avatar = p?.photoURL as string | undefined;
          const isMe = user?.uid === id;
          const isFollowing = followingSet.has(id);
          return (
            <View style={styles.item}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.itemMain}
                onPress={() =>
                  navigateToUserDetail(navigation as any, id, name, avatar)
                }
              >
                <AvatarImage uri={avatar} size={44} style={styles.itemAvatar} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {name}
                  </Text>
                  <RankText userId={id} />
                </View>
              </TouchableOpacity>

              {!isMe && (
                <FollowPill
                  targetUserId={id}
                  isFollowing={isFollowing}
                  requireAuth={requireAuth}
                />
              )}
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {mode === "following" ? "フォローしているユーザーがいません" : "フォロワーがいません"}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
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
  listContent: {
    backgroundColor: colors.backgroundSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderPrimary,
    marginLeft: spacing.xl + 44 + spacing.md, // 左のアバター分を空ける
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },
  itemMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: spacing.md,
  },
  itemAvatar: {
    marginRight: spacing.md,
  },
  itemName: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  itemSub: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  followPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#FACC15",
    backgroundColor: colors.backgroundSecondary,
  },
  followPillFollowing: {
    borderColor: "#FDE047",
    backgroundColor: colors.backgroundSecondary,
  },
  followPillText: {
    fontSize: typography.fontSize.sm,
    color: colors.black,
    fontWeight: "700",
  },
  followIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing["3xl"],
  },
  emptyText: {
    color: colors.textSecondary,
  },
});

export default FollowListScreen;

// 下: 補助コンポーネント（1ユーザーの階級表示）
const RankText: React.FC<{ userId: string }> = ({ userId }) => {
  const { mode: themeMode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[themeMode], [themeMode]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [days, setDays] = useState<number>(0);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const d = await UserStatsService.getUserCurrentDaysForRank(userId);
        if (mounted) setDays(d);
      } catch {
        if (mounted) setDays(0);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);
  return (
    <Text style={styles.itemSub} numberOfLines={1}>
      {getRankDisplayByDays(days)}
    </Text>
  );
};

const FollowPill: React.FC<{
  targetUserId: string;
  isFollowing: boolean;
  requireAuth: () => Promise<boolean>;
}> = ({ targetUserId, isFollowing, requireAuth }) => {
  const { mode: themeMode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[themeMode], [themeMode]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);
  const handlePress = async () => {
    if (busy) return;
    const ok = await requireAuth();
    if (!ok) return;
    setBusy(true);
    try {
      if (isFollowing) {
        FollowStore.remove(targetUserId);
        await FollowService.unfollow(targetUserId);
      } else {
        FollowStore.add(targetUserId);
        await FollowService.follow(targetUserId);
      }
    } catch {
      // ignore errors; UI will resync via subscription
    } finally {
      setBusy(false);
    }
  };
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={busy}
      style={[styles.followPill, isFollowing && styles.followPillFollowing]}
    >
      <View style={styles.followIconWrap}>
        <Ionicons name={isFollowing ? "checkmark" : "add"} size={12} color={colors.white} />
      </View>
      <Text style={styles.followPillText}>{isFollowing ? "フォロー中" : "フォローする"}</Text>
    </TouchableOpacity>
  );
};

