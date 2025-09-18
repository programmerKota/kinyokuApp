import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";

import { colors, spacing } from "@shared/theme";

interface ListFooterSpinnerProps {
  loading: boolean;
  color?: string;
  paddingVertical?: number;
  showWhenEmpty?: boolean;
}

const ListFooterSpinner: React.FC<ListFooterSpinnerProps> = ({
  loading,
  color = colors.primary,
  paddingVertical = spacing.lg,
  showWhenEmpty = false,
}) => {
  if (!loading) return null;
  return (
    <View style={[styles.container, { paddingVertical }]}>
      <ActivityIndicator color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ListFooterSpinner;
