import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";

import { colors, spacing, typography, shadows } from "@shared/theme";

interface DiaryButtonProps {
  onPress: () => void;
  // オプション: ボタン背景色と文字色を切り替え可能にする
  backgroundColor?: string;
  textColor?: string;
}

const DiaryButton: React.FC<DiaryButtonProps> = ({
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
        <Ionicons name="book" size={20} color={colors.success} />
      </View>
      <Text style={[styles.text, textColor ? { color: textColor } : null]}>日記</Text>
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
    backgroundColor: "#E8F6EF",
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

export default DiaryButton;
