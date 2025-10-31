import React from "react";
import { StyleSheet, Text, View } from "react-native";

import usePremiumStatus from "@shared/hooks/usePremiumStatus";
import { spacing, typography, useAppTheme } from "@shared/theme";
import { colorSchemes } from "@shared/theme/colors";

type AdBannerProps = {
  placement?: string;
  style?: object;
};

/**
 * 現時点では実際の広告SDKを組み込んでいないため、
 * プレースホルダーのみを表示する簡易コンポーネント。
 * 将来的にSDKを導入する際はこのファイルで差し替える。
 */
const AdBanner: React.FC<AdBannerProps> = ({ placement, style }) => {
  const { mode } = useAppTheme();
  const colors = colorSchemes[mode];
  const { isPremium } = usePremiumStatus();

  if (isPremium) return null;

  return (
    <View
      style={[
        styles.placeholder,
        { borderColor: colors.borderPrimary, backgroundColor: colors.backgroundSecondary },
        style,
      ]}
    >
      <Text style={[styles.badge, { backgroundColor: colors.primary }]}>広告</Text>
      <Text style={[styles.placeholderTitle, { color: colors.textPrimary }]}>
        {placement ? `${placement} バナー` : "広告バナー"}
      </Text>
      <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
        広告SDK導入後に表示される予定のスペースです。
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  badge: {
    color: "#fff",
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: spacing.xs,
  },
  placeholderTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  placeholderText: {
    fontSize: typography.fontSize.xs,
    textAlign: "center",
    lineHeight: typography.fontSize.xs * 1.4,
  },
});

export default AdBanner;
