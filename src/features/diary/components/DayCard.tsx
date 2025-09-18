import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

import { colors, spacing, typography, shadows } from '@shared/theme';

interface DayCardProps {
  day: number;
  selected?: boolean;
  onPress?: (day: number) => void;
}

const DayCard: React.FC<DayCardProps> = ({ day, selected = false, onPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, selected && styles.selected]}
      onPress={() => onPress?.(day)}
    >
      <Text style={[styles.title, selected && styles.titleSelected]}>{day}日目</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm,
    ...shadows.sm,
  },
  selected: {
    backgroundColor: '#E5F2FF',
    borderColor: colors.info,
    borderWidth: 1,
  },
  title: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  titleSelected: {
    color: colors.info,
    fontWeight: '700',
  },
});

export default DayCard;

