import type { HistoryStackParamList } from "@app/navigation/HistoryStackNavigator";
import type { Challenge, Payment } from "@project-types";
import type { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@app/contexts/AuthContext";
import {
  ChallengeService,
  PaymentFirestoreService,
} from "@core/services/firestore";
import { StatsService } from "@core/services/statsService";
import HistoryCard from "@features/history/components/HistoryCard";
import {
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
} from "@shared/theme";
import AppStatusBarComponent from "@shared/theme/AppStatusBar";
import { colorSchemes, type ColorPalette } from "@shared/theme/colors";
import { createScreenThemes } from "@shared/theme/screenThemes";
import { toDate, type DateLike } from "@shared/utils/date";

const HistoryScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation =
    useNavigation<StackNavigationProp<HistoryStackParamList, "HistoryMain">>();
  const { mode } = useAppTheme();
  const colors = useMemo(
    () => colorSchemes[mode] ?? colorSchemes.light,
    [mode],
  );
  const styles = useThemedStyles(createStyles);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Firestoreからデータを取得
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        return;
      }

      try {
        const firestoreChallenges = await ChallengeService.getUserChallenges(
          user.uid,
        );
        const challengesData = firestoreChallenges.map((challenge) => ({
          id: challenge.id,
          userId: challenge.userId,
          goalDays: challenge.goalDays,
          penaltyAmount: challenge.penaltyAmount,
          status: challenge.status,
          startedAt: toDate(challenge.startedAt as unknown as DateLike),
          completedAt: challenge.completedAt
            ? toDate(challenge.completedAt as unknown as DateLike)
            : undefined,
          failedAt: challenge.failedAt
            ? toDate(challenge.failedAt as unknown as DateLike)
            : undefined,
          totalPenaltyPaid: challenge.totalPenaltyPaid,
          reflectionNote: challenge.reflectionNote ?? null,
          reflection: challenge.reflection ?? null,
          createdAt: toDate(challenge.createdAt as unknown as DateLike),
          updatedAt: toDate(challenge.updatedAt as unknown as DateLike),
        }));
        setChallenges(challengesData);

        try {
          const list = await PaymentFirestoreService.getUserPayments(user.uid);
          const mapped: Payment[] = list.map((p) => ({
            id: p.id,
            userId: p.userId,
            amount: p.amount,
            type: p.type as Payment["type"],
            status: p.status as Payment["status"],
            transactionId: p.transactionId ?? undefined,
            createdAt: toDate(p.createdAt as unknown as DateLike),
            updatedAt: toDate(p.updatedAt as unknown as DateLike),
          }));
          setPayments(mapped);
        } catch {
          setPayments([]);
        }
      } catch (error) {
        console.error("データの取得でエラーが発生しました:", error);
      }
    };

    void fetchData();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (!user?.uid) {
      setRefreshing(false);
      return;
    }

    try {
      const firestoreChallenges = await ChallengeService.getUserChallenges(
        user.uid,
      );
      const challengesData = firestoreChallenges.map((challenge) => ({
        id: challenge.id,
        userId: challenge.userId,
        goalDays: challenge.goalDays,
        penaltyAmount: challenge.penaltyAmount,
        status: challenge.status,
        startedAt: toDate(challenge.startedAt as unknown as DateLike),
        completedAt: challenge.completedAt
          ? toDate(challenge.completedAt as unknown as DateLike)
          : undefined,
        failedAt: challenge.failedAt
          ? toDate(challenge.failedAt as unknown as DateLike)
          : undefined,
        totalPenaltyPaid: challenge.totalPenaltyPaid,
        reflection: challenge.reflection ?? null,
        reflectionNote: challenge.reflectionNote ?? null,
        createdAt: toDate(challenge.createdAt as unknown as DateLike),
        updatedAt: toDate(challenge.updatedAt as unknown as DateLike),
      }));
      setChallenges(challengesData);

      try {
        const list = await PaymentFirestoreService.getUserPayments(user.uid);
        const mapped: Payment[] = list.map((p) => ({
          id: p.id,
          userId: p.userId,
          amount: p.amount,
          type: p.type as Payment["type"],
          status: p.status as Payment["status"],
          transactionId: p.transactionId ?? undefined,
          createdAt: toDate(p.createdAt as unknown as DateLike),
          updatedAt: toDate(p.updatedAt as unknown as DateLike),
        }));
        setPayments(mapped);
      } catch {
        setPayments([]);
      }
    } catch (error) {
      console.error("データの更新でエラーが発生しました:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNavigateToSummary = useCallback(() => {
    navigation.navigate("FailureSummary");
  }, [navigation]);

  const challengeStats = StatsService.calculateStats(challenges);

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBarComponent />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>履歴</Text>
        <TouchableOpacity
          style={styles.summaryButton}
          activeOpacity={0.8}
          onPress={handleNavigateToSummary}
        >
          <Ionicons name="analytics-outline" size={18} color={colors.primary} />
          <Text style={styles.summaryButtonText}>原因サマリー</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.recordCard}>
          <View style={styles.recordHeader}>
            <View style={styles.waveIcon}>
              <Ionicons name="pulse" size={24} color={colors.white} />
            </View>
            <Text style={styles.recordTitle}>継続記録</Text>
          </View>

          <View style={styles.recordStats}>
            <View style={styles.statBox}>
              <View style={styles.statIcon}>
                <Ionicons name="time" size={20} color={colors.white} />
              </View>
              <Text style={styles.statLabel}>平均時間</Text>
              {(() => {
                const formatted = StatsService.formatDuration(
                  challengeStats.averageTime,
                );
                const { days, time } =
                  StatsService.splitFormattedDuration(formatted);
                return (
                  <>
                    <Text style={styles.statValue}>
                      {challengeStats.averageTime > 0 ? days : "0日"}
                    </Text>
                    <Text style={styles.statSubValue}>
                      {challengeStats.averageTime > 0 ? time : "00:00:00"}
                    </Text>
                  </>
                );
              })()}
            </View>

            <View style={styles.statBox}>
              <View style={styles.statIcon}>
                <Ionicons name="trophy" size={20} color={colors.white} />
              </View>
              <Text style={styles.statLabel}>最長記録</Text>
              {(() => {
                const formatted = StatsService.formatDuration(
                  challengeStats.longestTime,
                );
                const { days, time } =
                  StatsService.splitFormattedDuration(formatted);
                return (
                  <>
                    <Text style={styles.statValue}>
                      {challengeStats.longestTime > 0 ? days : "0日"}
                    </Text>
                    <Text style={styles.statSubValue}>
                      {challengeStats.longestTime > 0 ? time : "00:00:00"}
                    </Text>
                  </>
                );
              })()}
            </View>
          </View>

          <View style={styles.challengeCountBox}>
            <View style={styles.challengeIcon}>
              <Ionicons name="flag" size={20} color={colors.white} />
            </View>
            <Text style={styles.challengeLabel}>チャレンジ回数</Text>
            <Text style={styles.challengeValue}>
              {challengeStats.totalChallenges}回
            </Text>
          </View>
        </View>

        <View style={styles.pastRecordsSection}>
          <View style={styles.pastRecordsHeader}>
            <Ionicons name="trophy" size={20} color={colors.textSecondary} />
            <Text style={styles.pastRecordsTitle}>過去の記録</Text>
          </View>

          {challenges.length > 0 ? (
            <View>
              {challenges.map((item) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  type="challenge"
                  onPress={() => {
                    /* noop */
                  }}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.leafIcon}>
                <Ionicons name="leaf" size={32} color={colors.gray300} />
              </View>
              <Text style={styles.emptyTitle}>まだ記録がありません</Text>
              <Text style={styles.emptyText}>
                最初のチャレンジを始めましょう！
              </Text>
            </View>
          )}
        </View>

        <View style={styles.pastRecordsSection}>
          <View style={styles.pastRecordsHeader}>
            <Ionicons name="card" size={20} color={colors.textSecondary} />
            <Text style={styles.pastRecordsTitle}>支払い履歴</Text>
          </View>

          {payments.length > 0 ? (
            <View>
              {payments.map((item) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  type="payment"
                  onPress={() => {
                    /* noop */
                  }}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.leafIcon}>
                <Ionicons name="cash" size={32} color={colors.gray300} />
              </View>
              <Text style={styles.emptyTitle}>支払い履歴はありません</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ColorPalette) => {
  const screenThemes = createScreenThemes(colors);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundTertiary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      backgroundColor: colors.backgroundPrimary,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    backButton: {
      padding: spacing.sm,
    },
    title: {
      fontSize: typography.fontSize["2xl"],
      fontWeight: "bold",
      color: colors.textPrimary,
      textAlign: "center",
      flex: 1,
    },
    summaryButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.backgroundSecondary,
      minWidth: 120,
      justifyContent: "center",
    },
    summaryButtonText: {
      marginLeft: spacing.xs,
      color: colors.primary,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
    },
    content: {
      flex: 1,
    },
    recordCard: {
      backgroundColor: screenThemes.history.cardBg,
      margin: spacing.xl,
      borderRadius: 20,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
      shadowColor: colors.black,
      shadowOpacity: 0.15,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    recordHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.xl,
    },
    waveIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        screenThemes.history.badgeBg || "rgba(255, 255, 255, 0.18)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.md,
    },
    recordTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: "bold",
      color: colors.white,
    },
    recordStats: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: spacing.xl,
    },
    statBox: {
      flex: 1,
      alignItems: "center",
      marginHorizontal: spacing.sm,
      backgroundColor: screenThemes.history.tintSoft,
      borderRadius: 16,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
    },
    statIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor:
        screenThemes.history.badgeBg || "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    statLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.white,
      marginBottom: spacing.xs,
      textAlign: "center",
    },
    statValue: {
      fontSize: typography.fontSize.lg,
      fontWeight: "bold",
      color: colors.white,
      marginBottom: spacing.xs,
    },
    statSubValue: {
      fontSize: typography.fontSize.sm,
      color: "rgba(255, 255, 255, 0.8)",
    },
    challengeCountBox: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: screenThemes.history.tintSoft,
      borderRadius: 16,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
    },
    challengeIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor:
        screenThemes.history.badgeBg || "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.md,
    },
    challengeLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.white,
      marginRight: spacing.sm,
    },
    challengeValue: {
      fontSize: typography.fontSize.lg,
      fontWeight: "bold",
      color: colors.white,
    },
    pastRecordsSection: {
      padding: spacing.xl,
    },
    pastRecordsHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.xl,
    },
    pastRecordsTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: "600",
      color: colors.textPrimary,
      marginLeft: spacing.sm,
    },
    emptyContainer: {
      alignItems: "center",
      paddingVertical: spacing["4xl"],
    },
    leafIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.gray100,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    emptyText: {
      fontSize: typography.fontSize.sm,
      color: colors.textTertiary,
      textAlign: "center",
    },
  });
};

export default HistoryScreen;
