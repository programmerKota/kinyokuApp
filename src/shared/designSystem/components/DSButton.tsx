import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle, StyleProp, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@shared/theme";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = {
  title: string;
  onPress?: () => void | Promise<void>;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  textColor?: string;
  testID?: string;
};

const DSButton: React.FC<Props> = ({ title, onPress, disabled, style, variant = "primary", icon, loading, textColor, testID }) => {
  const bg = variant === "primary"
    ? colors.primary
    : variant === "secondary"
    ? colors.secondary
    : variant === "danger"
    ? colors.error
    : "transparent";
  const color = textColor ?? (variant === "ghost" ? colors.primary : colors.white);
  const borderColor = variant === "ghost" ? colors.borderPrimary : "transparent";
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: pressed ? 0.9 : 1, borderColor },
        style,
      ]}
      disabled={disabled}
      onPress={() => { try { void onPress?.(); } catch {} }}
    >
      <View style={styles.contentRow}>
        {loading ? (
          <Ionicons name="refresh" size={18} color={color} />
        ) : icon ? (
          <Ionicons name={icon} size={18} color={color} />
        ) : null}
        {(icon || loading) ? <View style={{ width: 8 }} /> : null}
        <Text style={[styles.text, { color }]}>{title}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  contentRow: { flexDirection: 'row', alignItems: 'center' },
  text: { fontWeight: "700" },
});

export default DSButton;
