import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

import type { UserRanking } from "@core/services/rankingService";
import UserProfileWithRank from "@shared/components/UserProfileWithRank";
import { useDisplayProfile } from "@shared/hooks/useDisplayProfile";
import { useAppTheme } from "@shared/theme";

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return "trophy" as const;
    case 2:
      return "medal" as const;
    case 3:
      return "medal-outline" as const;
    default:
      return "person" as const;
  }
};

const getRankColor = (rank: number, colors: any) => {
  switch (rank) {
    case 1:
      return colors.warning; // 金
    case 2:
      return colors.textSecondary; // 銀
    case 3:
      return colors.warning; // 銅（warningを少し暗くした色が理想だが、warningを使用）
    default:
      return colors.textPrimary;
  }
};

export interface RankingListItemProps {
  item: UserRanking;
  avgDays: number;
  currentUserId?: string | null;
  onPress: (userId: string, userName: string, userAvatar?: string) => void;
}

const RankingListItem: React.FC<RankingListItemProps> = ({
  item,
  avgDays,
  currentUserId,
  onPress,
}) => {
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const styles = useMemo(() => createStyles(mode), [mode]);

  const isCurrentUser = currentUserId === item.id;
  const { name: displayName, avatar: displayAvatar } = useDisplayProfile(
    item.id,
    item.name,
    item.avatar,
  );

  return (
    <View style={[styles.rankingItem, isCurrentUser && styles.currentUserItem]}>
      {isCurrentUser && (
        <View style={styles.youBadgeContainer}>
          <Text style={styles.youBadgeText}>You</Text>
        </View>
      )}
      <View style={styles.rankContainer}>
        <Ionicons
          name={getRankIcon(item.rank) as any}
          size={24}
          color={getRankColor(item.rank, colors)}
        />
        <Text style={[styles.rankNumber, { color: getRankColor(item.rank, colors) }]}>
          {item.rank}
        </Text>
      </View>

      <UserProfileWithRank
        userName={displayName}
        userAvatar={displayAvatar}
        averageDays={avgDays}
        averageSeconds={item.averageTime || 0}
        onPress={() => onPress(item.id, displayName, displayAvatar)}
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

const createStyles = (mode: "light" | "dark") => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];

  return StyleSheet.create({
    rankingItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundSecondary,
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
      backgroundColor: colors.backgroundPrimary,
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
  });
};

export default React.memo(RankingListItem, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.rank === next.item.rank &&
    prev.item.averageTime === next.item.averageTime &&
    prev.avgDays === next.avgDays &&
    prev.currentUserId === next.currentUserId
  );
});
