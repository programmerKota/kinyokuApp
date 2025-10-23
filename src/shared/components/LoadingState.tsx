import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, type StyleProp, type ViewStyle } from "react-native";

import { colors, spacing, typography } from "@shared/theme";

export type LoadingVariant = "default" | "overlay" | "inline" | "minimal";

interface LoadingStateProps {
  message?: string;
  variant?: LoadingVariant;
  size?: "small" | "large";
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = "読み込み中...",
  variant = "default",
  size = "large",
  color = colors.primary,
  style,
  testID,
}) => {
  const containerStyle = [styles.container, styles[variant], style];

  const textStyle = [styles.text, variant === "minimal" && styles.minimalText];

  return (
    <View style={containerStyle}>
      <ActivityIndicator
        testID={testID || "loading-activity-indicator"}
        size={size}
        color={color}
      />
      {message && <Text style={textStyle}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  default: {
    flex: 1,
    paddingVertical: spacing["3xl"],
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    zIndex: 1000,
  },
  inline: {
    paddingVertical: spacing.lg,
  },
  minimal: {
    paddingVertical: spacing.sm,
  },
  text: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: "center",
  },
  minimalText: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.sm,
  },
});

export default LoadingState;
