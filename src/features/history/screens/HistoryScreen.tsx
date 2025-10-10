import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native";

import { useAuth } from "@app/contexts/AuthContext";
import { ChallengeService, PaymentFirestoreService } from "@core/services/firestore";
import { StatsService } from "@core/services/statsService";
import HistoryCard from "@features/history/components/HistoryCard";
import type { Challenge, Payment } from "@project-types";
import { colors, spacing, typography } from "@shared/theme";

const HistoryScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // 画面表示中のみ1秒ごとに再描画して、進行中チャレンジの時間・統計をリアルタイム更新
  const [, setNowTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => setNowTick((t) => t + 1), 1000);
      return () => clearInterval(id);
    }, []),
  );

  // Firestoreからデータを取得
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        return;
      }

      try {
        // チャレンジ履歴を取得
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

        // 支払い履歴を取得（ベストエフォート）
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
        console.error("データの取得に失敗しました:", error);
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
      // チャレンジ履歴を再取得
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

      // 支払い履歴を再取得
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
      console.error("データの再取得に失敗しました:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const challengeStats = StatsService.calculateStats(challenges);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.backgroundTertiary}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>履歴</Text>
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
        {/* あなたの記録カード */}
        <View style={styles.recordCard}>
          <View style={styles.recordHeader}>
            <View style={styles.waveIcon}>
              <Ionicons name="pulse" size={24} color={colors.white} />
            </View>
            <Text style={styles.recordTitle}>あなたの記録</Text>
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

        {/* 過去の記録セクション */}
        <View style={styles.pastRecordsSection}>
          <View style={styles.pastRecordsHeader}>
            <Ionicons name="trophy" size={20} color={colors.textSecondary} />
            <Text style={styles.pastRecordsTitle}>過去の記録</Text>
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
              <Text style={styles.emptyTitle}>まだ記録がありません</Text>
              <Text style={styles.emptyText}>
                最初のチャレンジを始めましょう！
              </Text>
            </View>
          )}
        </View>

        {/* 支払い履歴セクション */}
        <View style={styles.pastRecordsSection}>
          <View style={styles.pastRecordsHeader}>
            <Ionicons name="card" size={20} color={colors.textSecondary} />
            <Text style={styles.pastRecordsTitle}>支払い履歴</Text>
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
              <Text style={styles.emptyTitle}>支払い履歴はありません</Text>
              <Text style={styles.emptyText}>ペナルティ支払いがここに表示されます</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: "#8B5CF6",
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: spacing.lg,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: spacing.lg,
  },
  challengeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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

export default HistoryScreen;
