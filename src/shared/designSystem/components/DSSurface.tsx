import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { colors, shadows } from "@shared/theme";

type Props = { style?: StyleProp<ViewStyle>; children?: React.ReactNode; elevation?: keyof typeof shadows };

const DSSurface: React.FC<Props> = ({ style, children, elevation = "base" }) => {
  const shadow = (shadows as any)[elevation] ?? shadows.base;
  return (
    <View style={[styles.base, { backgroundColor: colors.backgroundSecondary }, shadow, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({ base: { borderRadius: 12, padding: 16 } });

export default DSSurface;

