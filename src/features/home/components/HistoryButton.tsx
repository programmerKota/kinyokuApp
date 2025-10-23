import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";

import { spacing, typography, shadows, useAppTheme } from "@shared/theme";

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
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];

  const bgColor =
    backgroundColor ?? (mode === "dark" ? colors.black : colors.white);
  const labelColor =
    textColor ?? (mode === "dark" ? colors.white : colors.black);
  const borderColor = mode === "dark" ? colors.gray300 : colors.gray200;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: bgColor, borderColor }]}
      onPress={onPress}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}
      >
        <Ionicons name="time" size={20} color={colors.primary} />
      </View>
      <Text style={[styles.text, { color: labelColor }]}>履歴</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 76,
    width: "100%",
    borderWidth: 1,
    ...shadows.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  text: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textAlign: "center",
    lineHeight: typography.fontSize.base * 1.25,
    paddingHorizontal: spacing.sm,
  },
});

export default HistoryButton;
