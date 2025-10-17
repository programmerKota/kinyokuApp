import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";

import { colors, spacing, typography, shadows } from "@shared/theme";

interface HistoryButtonProps {
  onPress: () => void;
  // オプション: ボタン背景色と文字色を切り替え可能にする
  backgroundColor?: string;
  textColor?: string;
}

const HistoryButton: React.FC<HistoryButtonProps> = ({
  onPress,
  backgroundColor,
  textColor,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, backgroundColor ? { backgroundColor } : null]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="time" size={20} color={colors.primary} />
      </View>
      <Text style={[styles.text, textColor ? { color: textColor } : null]}>履歴</Text>
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
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  text: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: typography.fontSize.base * 1.25,
    paddingHorizontal: spacing.sm,
  },
});

export default HistoryButton;
