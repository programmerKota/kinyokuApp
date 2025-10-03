import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";

import { colors, spacing, typography, shadows } from "@shared/theme";

interface RankingButtonProps {
  onPress: () => void;
  title?: string;
  style?: any;
}

const RankingButton: React.FC<RankingButtonProps> = ({
  onPress,
  title = "ランキング",
  style,
}) => {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Ionicons name={"trophy"} size={20} color={colors.warning} />
      </View>
      <Text
        style={styles.text}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 76,
    width: "100%",
    ...shadows.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.warningLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  text: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: typography.fontSize.sm * 1.35,
    paddingHorizontal: spacing.sm,
  },
});

export default RankingButton;
