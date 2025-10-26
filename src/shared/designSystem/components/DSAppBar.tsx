import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { colors, spacing } from "@shared/theme";

type Props = {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
};

const DSAppBar: React.FC<Props> = ({ title, left, right }) => (
  <View style={styles.root}>
    <View style={styles.side}>{left}</View>
    <Text style={styles.title} numberOfLines={1}>
      {title}
    </Text>
    <View style={styles.side}>{right}</View>
  </View>
);

const styles = StyleSheet.create({
  root: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    backgroundColor: colors.backgroundPrimary,
  },
  side: { width: 56, alignItems: "center", justifyContent: "center" },
  title: {
    flex: 1,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 18,
    color: colors.textPrimary,
  },
});

export default DSAppBar;
