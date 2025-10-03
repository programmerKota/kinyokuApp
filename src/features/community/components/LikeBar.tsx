import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

import { useLikeState, LikeStore } from "@shared/state/likeStore";
import { colors, spacing, typography } from "@shared/theme";

interface LikeBarProps {
  postId: string;
  initialLikes: number;
  initialIsLiked: boolean;
  onToggle?: (postId: string) => void | Promise<void>;
}

const LikeBar: React.FC<LikeBarProps> = ({
  postId,
  initialLikes,
  initialIsLiked,
  onToggle,
}) => {
  const { likes, isLiked } = useLikeState(postId, {
    likes: initialLikes || 0,
    isLiked: !!initialIsLiked,
  });
  const [busy, setBusy] = useState(false);

  const handlePress = useCallback(async () => {
    if (!onToggle || busy) return;
    setBusy(true);
    try {
      LikeStore.touch(postId);
      // Optimistic update to avoid race with initialization/effects
      const current = LikeStore.get(postId) || { isLiked, likes };
      const nextIsLiked = !current.isLiked;
      const nextLikes = Math.max(
        0,
        (current.likes || 0) + (nextIsLiked ? 1 : -1),
      );
      LikeStore.set(postId, { isLiked: nextIsLiked, likes: nextLikes });
      await onToggle(postId);
    } finally {
      setBusy(false);
    }
  }, [postId, onToggle, busy]);

  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={handlePress}
      disabled={busy}
    >
      <Ionicons
        name={isLiked ? "heart" : "heart-outline"}
        size={18}
        color={isLiked ? colors.error : colors.textSecondary}
      />
      <Text style={[styles.actionText, isLiked && styles.likedText]}>
        {likes}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    fontWeight: "500",
  },
  likedText: {
    color: colors.error,
  },
});

export default React.memo(LikeBar);
