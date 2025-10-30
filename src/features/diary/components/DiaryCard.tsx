import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

import RelativeTime from "@shared/components/RelativeTime";
import UserProfileWithRank from "@shared/components/UserProfileWithRank";
import { useDisplayProfile } from "@shared/hooks/useDisplayProfile";
import { spacing, useAppTheme, useThemedStyles } from "@shared/theme";
import { colorSchemes, type ColorPalette } from "@shared/theme/colors";
import { createUiStyles } from "@shared/ui/styles";
import type { DateLike } from "@shared/utils/date";
import { getContentStyle, getBlockLeftMargin } from "@shared/utils/nameUtils";

type Props = {
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  averageDays?: number;
  day?: number;
  content: string;
  createdAt: DateLike;
  onAuthorPress?: (uid: string, userName?: string) => void;
};

const DiaryCard: React.FC<Props> = ({
  authorId,
  authorName,
  authorAvatar,
  averageDays = 0,
  day,
  content,
  createdAt,
  onAuthorPress,
}) => {
  const { mode } = useAppTheme();
  const uiStyles = useThemedStyles(createUiStyles);
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const styles = useThemedStyles(createStyles);

  const { name: displayName, avatar: displayAvatar } = useDisplayProfile(
    authorId,
    authorName,
    authorAvatar,
  );
  const dayLabel = useMemo(() => {
    if (typeof day !== "number") return null;
    if (Number.isNaN(day)) return null;
    const normalizedDay = Math.trunc(day);
    if (normalizedDay <= 0) return null;
    return `${normalizedDay}日目の日記`;
  }, [day]);

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <UserProfileWithRank
            userName={displayName || "ユーザー"}
            userAvatar={displayAvatar}
            averageDays={averageDays}
            onPress={() => onAuthorPress?.(authorId, displayName)}
            size="small"
            showRank={false}
            showTitle={true}
            style={styles.userProfileContainer}
          />
          <View style={styles.metaContainer}>
            {dayLabel && <Text style={styles.dayBadge}>{dayLabel}</Text>}
            <RelativeTime value={createdAt} style={styles.timestampRight} />
          </View>
        </View>

        <View
          style={[styles.content, { marginLeft: getBlockLeftMargin("small") }]}
        >
          <Text
            style={[styles.text, getContentStyle("small", colors.textPrimary)]}
          >
            {" "}
            {content}{" "}
          </Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: { backgroundColor: colors.backgroundSecondary, marginBottom: 0 },
    inner: { padding: spacing.lg },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: spacing.sm,
      width: "100%",
    },
    timestampRight: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: 14,
      flexShrink: 0,
    },
    metaContainer: {
      alignItems: "flex-end",
      marginLeft: spacing.md,
    },
    dayBadge: {
      backgroundColor: colors.infoLight,
      color: colors.info,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
      fontSize: 12,
      fontWeight: "600",
      marginBottom: spacing.xs,
    },
    userProfileContainer: { flex: 1 },
    content: { marginBottom: spacing.xs },
    text: {},
  });

export default React.memo(
  DiaryCard,
  (a, b) =>
    a.authorId === b.authorId &&
    a.content === b.content &&
    String(a.createdAt) === String(b.createdAt) &&
    a.averageDays === b.averageDays &&
    a.day === b.day,
);
