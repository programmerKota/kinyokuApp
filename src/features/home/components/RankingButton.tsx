import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";

import { spacing, typography, shadows, useAppTheme } from "@shared/theme";

interface RankingButtonProps {
  onPress: () => void;
  title?: string;
  style?: any;
  // オプション: ボタン背景色と文字色を切り替え可能にする
  backgroundColor?: string;
  textColor?: string;
}

const RankingButton: React.FC<RankingButtonProps> = ({
  onPress,
  title = "ランキング",
  style,
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
      style={[styles.button, style, { backgroundColor: bgColor, borderColor }]}
      onPress={onPress}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: colors.warningLight }]}
      >
        <Ionicons name={"trophy"} size={20} color={colors.warning} />
      </View>
      <Text
        style={[styles.text, { color: labelColor }]}
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
    lineHeight: typography.fontSize.sm * 1.35,
    paddingHorizontal: spacing.sm,
  },
});

export default RankingButton;
