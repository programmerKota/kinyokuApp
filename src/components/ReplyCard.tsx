import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { colors, spacing, typography } from '../theme';
import type { CommunityComment } from '../types';
import RelativeTime from './RelativeTime';
import AvatarImage from './AvatarImage';

interface ReplyCardProps {
  reply: CommunityComment;
  onPress?: () => void;
  authorAverageDays?: number;
}

const ReplyCard: React.FC<ReplyCardProps> = ({ reply, onPress }) => {
  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress
    ? { activeOpacity: 0.8, onPress }
    : {};

  return (
    <Container style={styles.container} {...containerProps}>
      <View style={styles.header}>
        <View style={styles.avatarWrapper}>
          {reply.authorAvatar ? (
            <AvatarImage uri={reply.authorAvatar} size={32} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{reply.authorName.charAt(0)}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.author}>{reply.authorName}</Text>
          <RelativeTime value={reply.createdAt} style={styles.timestamp} />
        </View>
      </View>
      <Text style={styles.content}>{reply.content}</Text>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  headerText: {
    flex: 1,
  },
  author: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  content: {
    marginLeft: spacing.lg + 32,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: 20,
  },
});

export default ReplyCard;
