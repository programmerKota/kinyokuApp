import React from "react";
import { View, Text, StyleSheet } from "react-native";

import RelativeTime from "@shared/components/RelativeTime";
import UserProfileWithRank from "@shared/components/UserProfileWithRank";
import { colors, spacing } from "@shared/theme";
import uiStyles from "@shared/ui/styles";
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
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={[uiStyles.rowStart, styles.header]}>
          <UserProfileWithRank
            userName={authorName || "ユーザー"}
            userAvatar={authorAvatar}
            averageDays={averageDays}
            onPress={() => onAuthorPress?.(authorId, authorName)}
            size="small"
            showRank={false}
            showTitle={true}
            style={styles.userProfileContainer}
          />
          <RelativeTime value={createdAt} style={styles.timestampRight} />
        </View>

        <View style={[styles.content, { marginLeft: getBlockLeftMargin("small") }]}> 
          <Text style={[styles.text, getContentStyle("small")]}> {content} </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: colors.white, marginBottom: 0 },
  inner: { padding: spacing.lg },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 0, width: "100%", justifyContent: "space-between" },
  timestampRight: { marginLeft: spacing.md, color: colors.textSecondary, fontSize: 14, flexShrink: 0 },
  userProfileContainer: { flex: 1 },
  content: { marginBottom: spacing.xs },
  text: {},
});

export default React.memo(DiaryCard, (a, b) =>
  a.authorId === b.authorId &&
  a.authorName === b.authorName &&
  a.authorAvatar === b.authorAvatar &&
  a.content === b.content &&
  String(a.createdAt) === String(b.createdAt) &&
  a.averageDays === b.averageDays,
);
