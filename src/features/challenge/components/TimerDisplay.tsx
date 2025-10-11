import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import { colors, spacing, typography, shadows } from "@shared/theme";
import { formatDuration } from "@shared/utils/date";

interface TimerDisplayProps {
  actualDuration: number;
  currentSession?: {
    goalDays: number;
    penaltyAmount: number;
  } | null;
  progressPercent: number;
  isGoalAchieved: boolean;
  onStartPress: () => void;
  onStopPress: () => void;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
  actualDuration,
  currentSession,
  progressPercent,
  isGoalAchieved,
  onStartPress,
  onStopPress,
}) => {
  const days = Math.floor(actualDuration / (24 * 3600));
  const timeText = formatDuration(actualDuration).split(" ")[1];

  return (
    <View style={styles.container}>
      {!currentSession ? (
        <View style={styles.notStartedContainer}>
          <View style={styles.timerCard}>
            <Text style={styles.dayNumber}>{days}</Text>
            <Text style={styles.dayLabel}>日</Text>
            <Text style={styles.timeText}>{timeText}</Text>
          </View>
          <TouchableOpacity testID="start-btn" style={styles.startButton} onPress={onStartPress}>
            <Text style={styles.startButtonText}>禁欲開始</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.activeContainer}>
          <View style={styles.timerCard}>
            <Text style={styles.dayNumber}>{days}</Text>
            <Text style={styles.dayLabel}>日</Text>
            <Text style={styles.timeText}>{timeText}</Text>
          </View>
          <View style={styles.goalBannerActive}>
            <View
              style={[
                styles.progressOverlay,
                { width: `${Math.min(progressPercent, 100)}%` },
                // RN Web deprecation: use style.pointerEvents instead of prop
                { pointerEvents: 'none' as any },
              ]}
            />
            <View style={styles.goalBannerContent}>
              <Text style={styles.goalBannerText}>
                目標{currentSession.goalDays}日まで、{" "}
                {Math.round(progressPercent)}%達成！
              </Text>
            </View>
          </View>
          <TouchableOpacity testID="stop-btn" style={styles.stopButton} onPress={onStopPress}>
            <Text style={styles.stopButtonText}>停止</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing["3xl"],
  },
  notStartedContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    width: "100%",
  },
  activeContainer: {
    alignItems: "center",
    width: "100%",
    flex: 1,
    justifyContent: "center",
  },
  timerCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
    ...shadows.none,
  },
  dayNumber: {
    fontSize: 72,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: 80,
    marginBottom: spacing.sm,
    minHeight: 80,
    includeFontPadding: false,
  },
  dayLabel: {
    fontSize: 24,
    fontWeight: typography.fontWeight.normal,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 30,
    minHeight: 30,
    includeFontPadding: false,
  },
  timeText: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.light,
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: typography.letterSpacing.normal,
    fontVariant: ["tabular-nums"],
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing["5xl"],
    paddingVertical: spacing.lg,
    borderRadius: 12,
    marginTop: spacing["3xl"],
    ...shadows.lg,
  },
  startButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: "center",
  },
  stopButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing["5xl"],
    paddingVertical: spacing.lg,
    borderRadius: 12,
    marginTop: spacing["2xl"],
    ...shadows.lg,
  },
  stopButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: "center",
  },
  goalBannerActive: {
    width: "100%",
    backgroundColor: "#E8F5E8",
    borderRadius: 12,
    padding: spacing.lg,
    overflow: "hidden",
    marginVertical: spacing.lg,
    position: "relative",
  },
  goalBannerContent: {
    position: "relative",
    zIndex: 2,
  },
  progressOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(76, 175, 80, 0.25)",
    zIndex: 1,
  },
  goalBannerText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    textAlign: "center",
  },
});

export default TimerDisplay;
