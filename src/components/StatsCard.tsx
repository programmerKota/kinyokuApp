import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, typography, shadows } from '../theme';
import uiStyles from '../ui/styles';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  subtitle?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, subtitle }) => {
  return (
    <View style={styles.container}>
      <View style={[uiStyles.row, styles.header]}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
});

export default StatsCard;
