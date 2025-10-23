import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

import RelativeTime from "@shared/components/RelativeTime";
import UserProfileWithRank from "@shared/components/UserProfileWithRank";
import { useDisplayProfile } from "@shared/hooks/useDisplayProfile";
import { spacing, useAppTheme, useThemedStyles } from "@shared/theme";
import { createUiStyles } from "@shared/ui/styles";
import { getContentStyle, getBlockLeftMargin } from "@shared/utils/nameUtils";

type Props = {
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  averageDays?: number;
  content: string;
  createdAt: any;
  onAuthorPress?: (uid: string, userName?: string) => void;
};

const DiaryCard: React.FC<Props> = ({
  authorId,
  authorName,
  authorAvatar,
  averageDays = 0,
  content,
  createdAt,
  onAuthorPress,
}) => {
  const { mode } = useAppTheme();
  const uiStyles = useThemedStyles(createUiStyles);
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const styles = useMemo(() => createStyles(mode), [mode]);

  const { name: displayName, avatar: displayAvatar } = useDisplayProfile(
    authorId,
    authorName,
    authorAvatar,
  );

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={[uiStyles.rowStart, styles.header]}>
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
          <RelativeTime value={createdAt} style={styles.timestampRight} />
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

const createStyles = (mode: "light" | "dark") => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];

  return StyleSheet.create({
    container: { backgroundColor: colors.backgroundSecondary, marginBottom: 0 },
    inner: { padding: spacing.lg },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: spacing.sm,
      width: "100%",
      justifyContent: "space-between",
    },
    timestampRight: {
      marginLeft: spacing.md,
      color: colors.textSecondary,
      fontSize: 14,
      flexShrink: 0,
    },
    userProfileContainer: { flex: 1 },
    content: { marginBottom: spacing.xs },
    text: {},
  });
};

export default React.memo(
  DiaryCard,
  (a, b) =>
    a.authorId === b.authorId &&
    a.content === b.content &&
    String(a.createdAt) === String(b.createdAt) &&
    a.averageDays === b.averageDays,
);
