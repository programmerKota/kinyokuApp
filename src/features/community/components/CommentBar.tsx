import React, { useCallback, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '@shared/theme';
import { useReplyCount } from '@shared/state/replyStore';

interface CommentBarProps {
  postId: string;
  initialCount: number;
  onPress?: (postId: string) => void;
}

const CommentBar: React.FC<CommentBarProps> = ({ postId, initialCount, onPress }) => {
  const count = useReplyCount(postId, initialCount);
  const [busy, setBusy] = useState(false);

  const handle = useCallback(() => {
    if (busy) return;
    setBusy(true);
    try {
      onPress?.(postId);
    } finally {
      setBusy(false);
    }
  }, [busy, onPress, postId]);

  return (
    <TouchableOpacity style={styles.actionButton} onPress={handle} disabled={busy}>
      <Ionicons name="chatbubble-outline" size={18} color={colors.info} />
      <Text style={[styles.actionText, { color: colors.info }]}>{count}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
});

export default React.memo(CommentBar);

