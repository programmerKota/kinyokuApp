import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import { StatsService } from "@core/services/statsService";
import type { Challenge, Payment } from "@project-types";
import {
  spacing,
  typography,
  shadows,
  useAppTheme,
  useThemedStyles,
} from "@shared/theme";
import { colorSchemes, type ColorPalette } from "@shared/theme/colors";
import { createUiStyles } from "@shared/ui/styles";
import { formatDateTimeJP } from "@shared/utils/date";

interface HistoryCardProps {
  item: Challenge | Payment;
  type: "challenge" | "payment";
  onPress?: () => void;
}

const HistoryCard: React.FC<HistoryCardProps> = ({ item, type, onPress }) => {
  const { mode } = useAppTheme();
  const uiStyles = useThemedStyles(createUiStyles);
  const styles = useThemedStyles(createStyles);
  const colors = useMemo(
    () => colorSchemes[mode] ?? colorSchemes.light,
    [mode],
  );

  const calculateDuration = (challenge: Challenge) => {
    const startTime = challenge.startedAt.getTime();
    const endTime =
      challenge.status === "completed" && challenge.completedAt
        ? challenge.completedAt.getTime()
        : challenge.status === "failed" && challenge.failedAt
          ? challenge.failedAt.getTime()
          : Date.now();
    return Math.floor((endTime - startTime) / 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return colors.success;
      case "failed":
        return colors.error;
      case "active":
        return colors.info;
      case "paused":
        return colors.warning;
      case "pending":
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "完了";
      case "failed":
        return "失敗";
      case "active":
        return "進行中";
      case "paused":
        return "一時停止";
      case "pending":
        return "処理中";
      default:
        return status;
    }
  };

  if (type === "challenge") {
    const challenge = item as Challenge;
    const actualDuration = calculateDuration(challenge);

    return (
      <TouchableOpacity style={styles.container} onPress={onPress}>
        <View style={[uiStyles.row, styles.header]}>
          <View style={styles.iconContainer}>
            <Ionicons name="trophy" size={24} color={colors.primary} />
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>{challenge.goalDays}日間チャレンジ</Text>
          </View>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(challenge.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusText(challenge.status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.details}>
          <View style={[uiStyles.rowBetween, styles.detailRow]}>
            <Text style={styles.detailLabel}>実際の継続時間</Text>
            <Text style={styles.detailValue}>
              {StatsService.formatDuration(actualDuration)}
            </Text>
          </View>
          <View style={[uiStyles.rowBetween, styles.detailRow]}>
            <Text style={styles.detailLabel}>目標時間</Text>
            <Text style={styles.detailValue}>
              {StatsService.formatDuration(challenge.goalDays * 24 * 3600)}
            </Text>
          </View>
          <View style={[uiStyles.rowBetween, styles.detailRow]}>
            <Text style={styles.detailLabel}>ペナルティ金額</Text>
            <Text style={styles.detailValue}>
              ¥{challenge.penaltyAmount.toLocaleString()}
            </Text>
          </View>
          {challenge.status === "completed" && challenge.completedAt && (
            <View style={[uiStyles.rowBetween, styles.detailRow]}>
              <Text style={styles.detailLabel}>完了日</Text>
              <Text style={styles.detailValue}>
                {formatDateTimeJP(challenge.completedAt)}
              </Text>
            </View>
          )}
          {challenge.status === "failed" && challenge.failedAt && (
            <View style={[uiStyles.rowBetween, styles.detailRow]}>
              <Text style={styles.detailLabel}>失敗日</Text>
              <Text style={styles.detailValue}>
                {formatDateTimeJP(challenge.failedAt)}
              </Text>
            </View>
          )}
          {challenge.totalPenaltyPaid > 0 && (
            <View style={[uiStyles.rowBetween, styles.detailRow]}>
              <Text style={styles.detailLabel}>支払い済みペナルティ</Text>
              <Text style={[styles.detailValue, styles.penaltyText]}>
                ¥{challenge.totalPenaltyPaid.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  const payment = item as Payment;
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[uiStyles.row, styles.header]}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={
              payment.type === "penalty"
                ? "warning"
                : payment.type === "entry_fee"
                  ? "card"
                  : "gift"
            }
            size={24}
            color={
              payment.type === "penalty"
                ? colors.error
                : payment.type === "entry_fee"
                  ? colors.info
                  : colors.success
            }
          />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>
            {payment.type === "penalty"
              ? "ペナルティ支払い"
              : payment.type === "entry_fee"
                ? "参加費支払い"
                : "賞金受取"}
          </Text>
          <Text style={styles.subtitle}>
            {formatDateTimeJP(payment.createdAt)}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(payment.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(payment.status)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.details}>
        <View style={[uiStyles.rowBetween, styles.detailRow]}>
          <Text style={styles.detailLabel}>金額</Text>
          <Text
            style={[
              styles.detailValue,
              payment.type === "prize" ? styles.prizeText : styles.paymentText,
            ]}
          >
            {payment.type === "prize" ? "+" : ""}¥
            {payment.amount.toLocaleString()}
          </Text>
        </View>
        {payment.transactionId && (
          <View style={[uiStyles.rowBetween, styles.detailRow]}>
            <Text style={styles.detailLabel}>取引ID</Text>
            <Text style={styles.detailValue}>{payment.transactionId}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors: ColorPalette) => {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      padding: spacing.lg,
      marginBottom: spacing.md,
      ...shadows.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.gray100,
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.md,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: typography.fontSize.base,
      fontWeight: "600",
      color: colors.gray800,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
    },
    statusContainer: {
      marginLeft: spacing.md,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
    },
    statusText: {
      fontSize: typography.fontSize.xs,
      fontWeight: "600",
      color: colors.white,
    },
    details: {
      borderTopWidth: 1,
      borderTopColor: colors.gray100,
      paddingTop: spacing.md,
    },
    detailRow: {
      marginBottom: spacing.sm,
    },
    detailLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
    detailValue: {
      fontSize: typography.fontSize.sm,
      fontWeight: "600",
      color: colors.gray800,
    },
    penaltyText: {
      color: colors.error,
    },
    paymentText: {
      color: colors.info,
    },
    prizeText: {
      color: colors.success,
    },
  });
};

export default HistoryCard;
