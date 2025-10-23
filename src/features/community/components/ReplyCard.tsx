import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import type { CommunityComment } from "@project-types";
import AvatarImage from "@shared/components/AvatarImage";
import { useDisplayProfile } from "@shared/hooks/useDisplayProfile";
import RelativeTime from "@shared/components/RelativeTime";
import { spacing, typography, useAppTheme } from "@shared/theme";
import { CONTENT_LEFT_MARGIN } from "@shared/utils/nameUtils";

interface ReplyCardProps {
  reply: CommunityComment;
  onPress?: (userId: string, userName: string, userAvatar?: string) => void;
  authorAverageDays?: number;
}

const ReplyCard: React.FC<ReplyCardProps> = ({ reply, onPress }) => {
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const Container = onPress ? TouchableOpacity : View;
  const { name, avatar } = useDisplayProfile(
    reply.authorId,
    reply.authorName,
    reply.authorAvatar,
  );
  const containerProps = onPress
    ? {
        activeOpacity: 0.8,
        onPress: () => onPress?.(reply.authorId, name, avatar),
      }
    : {};

  return (
    <Container style={styles.container} {...containerProps}>
      <View style={styles.header}>
        <View style={styles.avatarWrapper}>
          <AvatarImage uri={avatar} size={32} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.author}>{name || "ユーザー"}</Text>
          <RelativeTime value={reply.createdAt} style={styles.timestamp} />
        </View>
      </View>
      <Text style={styles.content}>{reply.content ?? ""}</Text>
    </Container>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    // 前の余白・背景に戻す（従来のレイアウトを維持）
    paddingVertical: spacing.sm,
    paddingLeft: spacing.lg + CONTENT_LEFT_MARGIN.small,
    paddingRight: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  avatarWrapper: {
    marginRight: spacing.sm,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  headerText: {
    flex: 1,
  },
  author: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  content: {
    // 前の余白設定に戻す（返信入力のテキスト開始位置と同値）
    // container.padding (spacing.lg) + submitBtn.paddingHorizontal (spacing.lg) + 微調整(spacing.md)
    marginLeft: spacing.lg + spacing.lg + spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: 20,
  },
});

export default React.memo(
  ReplyCard,
  (a, b) =>
    a.reply.id === b.reply.id &&
    a.reply.content === b.reply.content &&
    ((a.reply as any).authorName ?? "") === ((b.reply as any).authorName ?? "") &&
    ((a.reply as any).authorAvatar ?? "") === ((b.reply as any).authorAvatar ?? ""),
);
