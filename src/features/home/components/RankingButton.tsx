import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

import { colors, spacing, typography, shadows } from '@shared/theme';

interface RankingButtonProps {
  onPress: () => void;
  title?: string;
  style?: any;
}

const RankingButton: React.FC<RankingButtonProps> = ({ onPress, title = 'ランキング', style }) => {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Ionicons name={title === '商品' ? 'cart' : 'trophy'} size={20} color={colors.warning} />
      </View>
      <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  text: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    flexShrink: 1,
  },
});

export default RankingButton;
