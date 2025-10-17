import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import type { CommunityComment } from "@project-types";
import AvatarImage from "@shared/components/AvatarImage";
import { useDisplayProfile } from "@shared/hooks/useDisplayProfile";
import RelativeTime from "@shared/components/RelativeTime";
import { colors, spacing, typography } from "@shared/theme";

interface ReplyCardProps {
  reply: CommunityComment;
  onPress?: () => void;
  authorAverageDays?: number;
}

const ReplyCard: React.FC<ReplyCardProps> = ({ reply, onPress }) => {
  const Container = onPress ? TouchableOpacity : View;
  const { name, avatar } = useDisplayProfile(
    reply.authorId,
    reply.authorName,
    reply.authorAvatar,
  );
  const containerProps = onPress ? { activeOpacity: 0.8, onPress } : {};

  return (
    <Container style={styles.container} {...containerProps}>
      <View style={styles.header}>
        <View style={styles.avatarWrapper}>
          {avatar ? (
            <AvatarImage uri={avatar} size={32} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{(name || "ユーザー").charAt(0)}</Text>
            </View>
          )}
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

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
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
    // Align reply content start with ReplyInputBar "返信を書く" button text start position
    // ReplyInputBar "返信を書く" text starts at: container.padding (spacing.lg) + submitBtn.paddingHorizontal (spacing.lg)
    marginLeft: spacing.lg + spacing.lg + spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: 20,
  },
});

export default React.memo(
  ReplyCard,
  (a, b) => a.reply.id === b.reply.id && a.reply.content === b.reply.content,
);
