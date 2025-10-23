import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import type { ViewStyle, TextStyle, StyleProp } from "react-native";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";

import { spacing, typography, useAppTheme } from "@shared/theme";
import { createButtonStyle } from "@shared/utils/styles";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  testID?: string;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  style,
  textStyle,
  icon,
  loading = false,
  testID,
}) => {
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[mode], [mode]);

  const buttonStyle = [
    createButtonStyle(variant, size, colors),
    disabled && styles.disabled,
    style,
  ];

  const getTextColor = () => {
    if (variant === "secondary") return colors.textSecondary;
    return colors.white;
  };

  const getTextSize = () => {
    if (size === "small") return typography.fontSize.sm;
    if (size === "large") return typography.fontSize.lg;
    return typography.fontSize.base;
  };

  const textStyleCombined = [
    {
      fontSize: getTextSize(),
      fontWeight: typography.fontWeight.semibold,
      color: getTextColor(),
    },
    disabled && styles.disabledText,
    textStyle,
  ];

  const getIconColor = () => {
    switch (variant) {
      case "primary":
        return colors.white;
      case "secondary":
        return colors.textSecondary;
      case "danger":
        return colors.white;
      default:
        return colors.white;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case "small":
        return 16;
      case "medium":
        return 18;
      case "large":
        return 20;
      default:
        return 18;
    }
  };

  return (
    <TouchableOpacity
      testID={testID}
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <View style={styles.buttonContent}>
        {loading ? (
          <Ionicons
            name="refresh"
            size={getIconSize()}
            color={getIconColor()}
          />
        ) : icon ? (
          <Ionicons name={icon} size={getIconSize()} color={getIconColor()} />
        ) : null}
        {icon || loading ? <View style={styles.iconSpacing} /> : null}
        <Text style={textStyleCombined} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconSpacing: {
    width: spacing.sm,
  },
  // Disabled state
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
});

export default Button;
