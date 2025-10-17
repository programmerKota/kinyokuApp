import React, { useMemo } from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

import { spacing, typography, shadows, useAppTheme } from "@shared/theme";

interface DayCardProps {
  day: number;
  selected?: boolean;
  posted?: boolean;
  onPress?: (day: number) => void;
}

const DayCard: React.FC<DayCardProps> = ({
  day,
  selected = false,
  posted = false,
  onPress,
}) => {
  const { mode } = useAppTheme();
  const styles = useMemo(() => createStyles(mode), [mode]);
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, selected && styles.selected]}
      onPress={() => onPress?.(day)}
    >
      {posted && <Text style={styles.badge}>済</Text>}
      <Text style={[styles.title, selected && styles.titleSelected]}>
        {day}日目
      </Text>
    </TouchableOpacity>
  );
};

const createStyles = (mode: "light" | "dark") => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];

  return StyleSheet.create({
    card: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      marginRight: spacing.sm,
      ...shadows.sm,
    },
    selected: {
      backgroundColor: "#E5F2FF",
      borderColor: colors.info,
      borderWidth: 1,
    },
    title: {
      fontSize: typography.fontSize.sm,
      color: colors.textPrimary,
      fontWeight: "600",
    },
    titleSelected: {
      color: colors.info,
      fontWeight: "700",
    },
    badge: {
      position: "absolute",
      top: -6,
      left: -6,
      backgroundColor: colors.successLight,
      color: colors.success,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: typography.fontSize.xs,
      zIndex: 1,
      overflow: "hidden",
    },
  });
};

export default DayCard;
