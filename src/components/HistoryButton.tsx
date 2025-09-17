import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

import { colors, spacing, typography, shadows } from '../theme';

interface HistoryButtonProps {
  onPress: () => void;
}

const HistoryButton: React.FC<HistoryButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Ionicons name="time" size={20} color={colors.primary} />
      </View>
      <Text style={styles.text}>履歴</Text>
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
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  text: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
});

export default HistoryButton;
