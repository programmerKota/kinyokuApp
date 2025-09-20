import React, { useCallback, useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '@shared/theme';
import { useLikeState } from '@shared/state/likeStore';

interface LikeBarProps {
  postId: string;
  initialLikes: number;
  initialIsLiked: boolean;
  onToggle?: (postId: string) => void | Promise<void>;
}

const LikeBar: React.FC<LikeBarProps> = ({ postId, initialLikes, initialIsLiked, onToggle }) => {
  const { likes, isLiked } = useLikeState(postId, {
    likes: initialLikes || 0,
    isLiked: !!initialIsLiked,
  });
  const [busy, setBusy] = useState(false);

  const handlePress = useCallback(async () => {
    if (!onToggle || busy) return;
    setBusy(true);
    try {
      await onToggle(postId);
    } finally {
      setBusy(false);
    }
  }, [postId, onToggle, busy]);

  return (
    <TouchableOpacity style={styles.actionButton} onPress={handlePress} disabled={busy}>
      <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={18} color={isLiked ? colors.error : colors.textSecondary} />
      <Text style={[styles.actionText, isLiked && styles.likedText]}>{likes}</Text>
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
  likedText: {
    color: colors.error,
  },
});

export default React.memo(LikeBar);

