import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppStatusBar from "@shared/theme/AppStatusBar";

import { useAuth } from "@app/contexts/AuthContext";
import { ChallengeService, PaymentFirestoreService } from "@core/services/firestore";
import { StatsService } from "@core/services/statsService";
import HistoryCard from "@features/history/components/HistoryCard";
import type { Challenge, Payment } from "@project-types";
import { spacing, typography, useAppTheme } from "@shared/theme";
import { createScreenThemes } from "@shared/theme/screenThemes";

const HistoryScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const screenThemes = useMemo(() => createScreenThemes(colors), [colors]);
  const styles = useMemo(() => createStyles(mode), [mode]);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // 騾ｲ陦御ｸｭ縺ｮ譎る俣陦ｨ遉ｺ縺ｯ蜷・き繝ｼ繝牙・縺ｧ蜃ｦ逅・☆繧九◆繧√∫判髱｢蜈ｨ菴薙・豈守ｧ貞・繝ｬ繝ｳ繝縺ｯ荳崎ｦ・

  // Firestore縺九ｉ繝・・繧ｿ繧貞叙蠕・
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        return;
      }

      try {
        // 繝√Ε繝ｬ繝ｳ繧ｸ螻･豁ｴ繧貞叙蠕・
        const firestoreChallenges = await ChallengeService.getUserChallenges(
          user.uid,
        );
        const challengesData = firestoreChallenges.map((challenge) => ({
          id: challenge.id,
          userId: challenge.userId,
          goalDays: challenge.goalDays,
          penaltyAmount: challenge.penaltyAmount,
          status: challenge.status,
          startedAt:
            challenge.startedAt instanceof Date
              ? challenge.startedAt
              : new Date(challenge.startedAt as any),
          completedAt:
            challenge.completedAt instanceof Date
              ? challenge.completedAt
              : challenge.completedAt
                ? new Date(challenge.completedAt as any)
                : undefined,
          failedAt:
            challenge.failedAt instanceof Date
              ? challenge.failedAt
              : challenge.failedAt
                ? new Date(challenge.failedAt as any)
                : undefined,
          totalPenaltyPaid: challenge.totalPenaltyPaid,
          createdAt:
            challenge.createdAt instanceof Date
              ? challenge.createdAt
              : new Date(challenge.createdAt as any),
          updatedAt:
            challenge.updatedAt instanceof Date
              ? challenge.updatedAt
              : new Date(challenge.updatedAt as any),
        }));
        setChallenges(challengesData);

        // 謾ｯ謇輔＞螻･豁ｴ繧貞叙蠕暦ｼ医・繧ｹ繝医お繝輔か繝ｼ繝茨ｼ・
        try {
          const list = await PaymentFirestoreService.getUserPayments(user.uid);
          const mapped: Payment[] = list.map((p) => ({
            id: p.id,
            userId: p.userId,
            amount: p.amount,
            type: p.type as Payment["type"],
            status: p.status as Payment["status"],
            transactionId: p.transactionId ?? undefined,
            createdAt: p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt as any),
            updatedAt: p.updatedAt instanceof Date ? p.updatedAt : new Date(p.updatedAt as any),
          }));
          setPayments(mapped);
        } catch {
          setPayments([]);
        }
      } catch (error) {
        console.error("繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆:", error);
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
      // 繝√Ε繝ｬ繝ｳ繧ｸ螻･豁ｴ繧貞・蜿門ｾ・
      const firestoreChallenges = await ChallengeService.getUserChallenges(
        user.uid,
      );
      const challengesData = firestoreChallenges.map((challenge) => ({
        id: challenge.id,
        userId: challenge.userId,
        goalDays: challenge.goalDays,
        penaltyAmount: challenge.penaltyAmount,
        status: challenge.status,
        startedAt:
          challenge.startedAt instanceof Date
            ? challenge.startedAt
            : new Date(challenge.startedAt as any),
        completedAt:
          challenge.completedAt instanceof Date
            ? challenge.completedAt
            : challenge.completedAt
              ? new Date(challenge.completedAt as any)
              : undefined,
        failedAt:
          challenge.failedAt instanceof Date
            ? challenge.failedAt
            : challenge.failedAt
              ? new Date(challenge.failedAt as any)
              : undefined,
        totalPenaltyPaid: challenge.totalPenaltyPaid,
        createdAt:
          challenge.createdAt instanceof Date
            ? challenge.createdAt
            : new Date(challenge.createdAt as any),
        updatedAt:
          challenge.updatedAt instanceof Date
            ? challenge.updatedAt
            : new Date(challenge.updatedAt as any),
      }));
      setChallenges(challengesData);

      // 謾ｯ謇輔＞螻･豁ｴ繧貞・蜿門ｾ・
      try {
        const list = await PaymentFirestoreService.getUserPayments(user.uid);
        const mapped: Payment[] = list.map((p) => ({
          id: p.id,
          userId: p.userId,
          amount: p.amount,
          type: p.type as Payment["type"],
          status: p.status as Payment["status"],
          transactionId: p.transactionId ?? undefined,
          createdAt: p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt as any),
          updatedAt: p.updatedAt instanceof Date ? p.updatedAt : new Date(p.updatedAt as any),
        }));
        setPayments(mapped);
      } catch {
        setPayments([]);
      }
    } catch (error) {
      console.error("繝・・繧ｿ縺ｮ蜀榊叙蠕励↓螟ｱ謨励＠縺ｾ縺励◆:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const challengeStats = StatsService.calculateStats(challenges);

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBar />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>螻･豁ｴ</Text>
        <View style={styles.placeholder} />
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
        {/* 縺ゅ↑縺溘・險倬鹸繧ｫ繝ｼ繝・*/}
        <View style={styles.recordCard}>
          <View style={styles.recordHeader}>
            <View style={styles.waveIcon}>
              <Ionicons name="pulse" size={24} color={colors.white} />
            </View>
            <Text style={styles.recordTitle}>縺ゅ↑縺溘・險倬鹸</Text>
          </View>

          <View style={styles.recordStats}>
            <View style={styles.statBox}>
              <View style={styles.statIcon}>
                <Ionicons name="time" size={20} color={colors.white} />
              </View>
              <Text style={styles.statLabel}>Average Duration</Text>
              {(() => {
                const formatted = StatsService.formatDuration(
                  challengeStats.averageTime,
                );
                const { days, time } =
                  StatsService.splitFormattedDuration(formatted);
                return (
                  <>
                    <Text style={styles.statValue}>
                      {challengeStats.averageTime > 0 ? days : "0譌･"}
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
              <Text style={styles.statLabel}>譛髟ｷ險倬鹸</Text>
              {(() => {
                const formatted = StatsService.formatDuration(
                  challengeStats.longestTime,
                );
                const { days, time } =
                  StatsService.splitFormattedDuration(formatted);
                return (
                  <>
                    <Text style={styles.statValue}>
                      {challengeStats.longestTime > 0 ? days : "0譌･"}
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
            <Text style={styles.challengeLabel}>繝√Ε繝ｬ繝ｳ繧ｸ蝗樊焚</Text>
            <Text style={styles.challengeValue}>
              {challengeStats.totalChallenges}蝗・
            </Text>
          </View>
        </View>

        {/* 驕主悉縺ｮ險倬鹸繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ */}
        <View style={styles.pastRecordsSection}>
          <View style={styles.pastRecordsHeader}>
            <Ionicons name="trophy" size={20} color={colors.textSecondary} />
            <Text style={styles.pastRecordsTitle}>驕主悉縺ｮ險倬鹸</Text>
          </View>

          {challenges.length > 0 ? (
            <FlatList
              data={challenges}
              renderItem={({ item }) => (
                <HistoryCard
                  item={item}
                  type="challenge"
                  onPress={() => {
                    /* noop */
                  }}
                />
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.leafIcon}>
                <Ionicons name="leaf" size={32} color={colors.gray300} />
              </View>
              <Text style={styles.emptyTitle}>縺ｾ縺險倬鹸縺後≠繧翫∪縺帙ｓ</Text>
              <Text style={styles.emptyText}>
                譛蛻昴・繝√Ε繝ｬ繝ｳ繧ｸ繧貞ｧ九ａ縺ｾ縺励ｇ縺・ｼ・
              </Text>
            </View>
          )}
        </View>

        {/* 謾ｯ謇輔＞螻･豁ｴ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ */}
        <View style={styles.pastRecordsSection}>
          <View style={styles.pastRecordsHeader}>
            <Ionicons name="card" size={20} color={colors.textSecondary} />
            <Text style={styles.pastRecordsTitle}>謾ｯ謇輔＞螻･豁ｴ</Text>
          </View>

          {payments.length > 0 ? (
            <FlatList
              data={payments}
              renderItem={({ item }) => (
                <HistoryCard
                  item={item}
                  type="payment"
                  onPress={() => {
                    /* noop */
                  }}
                />
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.leafIcon}>
                <Ionicons name="cash" size={32} color={colors.gray300} />
              </View>
              <Text style={styles.emptyTitle}>謾ｯ謇輔＞螻･豁ｴ縺ｯ縺ゅｊ縺ｾ縺帙ｓ</Text>
              <Text style={styles.emptyText}>No payment history yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (mode: "light" | "dark") => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];
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
    placeholder: {
      width: 40,
    },
    content: {
      flex: 1,
    },
    recordCard: {
      backgroundColor: screenThemes.history.cardBg,
      margin: spacing.xl,
      borderRadius: 20,
      padding: spacing.xl,
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
      backgroundColor: "rgba(255, 255, 255, 0.2)",
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
    },
    statIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: screenThemes.history.badgeBg || "rgba(255, 255, 255, 0.2)",
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
    },
    challengeIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: screenThemes.history.badgeBg || "rgba(255, 255, 255, 0.2)",
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

