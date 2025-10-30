import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@app/contexts/AuthContext";
import type { HistoryStackParamList } from "@app/navigation/HistoryStackNavigator";
import { ChallengeService } from "@core/services/firestore";
import FailureStrategyService from "@core/services/supabase/failureStrategyService";
import {
  FAILURE_DEVICES,
  FAILURE_FEELINGS,
  FAILURE_OTHER_LABEL,
  FAILURE_OTHER_OPTION_KEY,
  FAILURE_PLACES,
  FAILURE_TIME_SLOTS,
} from "@features/challenge/constants/failureReflectionOptions";
import type { FailureReflection } from "@project-types";
import { spacing, typography, useAppTheme } from "@shared/theme";
import AppStatusBarComponent from "@shared/theme/AppStatusBar";
import { colorSchemes, type ColorPalette } from "@shared/theme/colors";
import { formatDateTimeJP } from "@shared/utils/date";

const MAX_CUSTOM_NOTES = 30;

const sanitizeCustomValue = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
};

type SummaryItem = {
  key: string;
  label: string;
  count: number;
  ratio: number;
};

type SummarySectionData = {
  title: string;
  total: number;
  items: SummaryItem[];
};

type CustomNote = {
  id: string;
  category: string;
  value: string;
  recordedAt?: string;
};

type FailureSummaryData = {
  time: SummarySectionData;
  device: SummarySectionData;
  place: SummarySectionData;
  feelings: SummarySectionData;
  customNotes: CustomNote[];
  totalReflections: number;
};

type FailureSummaryNavigation = StackNavigationProp<
  HistoryStackParamList,
  "FailureSummary"
>;

const incrementCount = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

const labelFromOptions = (
  key: string,
  options: readonly { key: string; label: string }[],
) => {
  const matched = options.find((opt) => opt.key === key);
  if (matched) return matched.label;
  return key === FAILURE_OTHER_OPTION_KEY ? FAILURE_OTHER_LABEL : key;
};

const toSummarySection = (
  title: string,
  counts: Map<string, number>,
  options: readonly { key: string; label: string }[],
): SummarySectionData => {
  const total = Array.from(counts.values()).reduce((sum, val) => sum + val, 0);
  const items = Array.from(counts.entries())
    .map(([key, count]) => ({
      key,
      label: labelFromOptions(key, options),
      count,
      ratio: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.count - a.count);
  return { title, total, items };
};

const resolveTimestamp = (
  reflection: FailureReflection | null,
  failedAt?: Date,
  updatedAt?: Date,
) => {
  if (reflection?.recordedAt) return reflection.recordedAt;
  if (failedAt && !Number.isNaN(failedAt.getTime()))
    return failedAt.toISOString();
  if (updatedAt && !Number.isNaN(updatedAt.getTime()))
    return updatedAt.toISOString();
  return undefined;
};

const formatTimestamp = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatDateTimeJP(date);
};

const FailureSummaryScreen: React.FC = () => {
  const navigation = useNavigation<FailureSummaryNavigation>();
  const { user } = useAuth();
  const { mode } = useAppTheme();
  const colors = colorSchemes[mode];
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FailureSummaryData | null>(null);
  const [strategy, setStrategy] = useState("");
  const [strategyDraft, setStrategyDraft] = useState("");
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [savingStrategy, setSavingStrategy] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!user?.uid) {
        setSummary(null);
        setLoading(false);
        return;
      }

      try {
        const challenges = await ChallengeService.getUserChallenges(user.uid);
        const timeCounts = new Map<string, number>();
        const deviceCounts = new Map<string, number>();
        const placeCounts = new Map<string, number>();
        const feelingCounts = new Map<string, number>();
        const customNotes: CustomNote[] = [];
        let totalReflections = 0;

        challenges.forEach((challenge) => {
          const reflection = challenge.reflection ?? null;
          const recordedAt = resolveTimestamp(
            reflection,
            challenge.failedAt as Date | undefined,
            challenge.updatedAt as Date | undefined,
          );

          if (reflection) {
            totalReflections += 1;

            const timeSelection = reflection.timeSlot;
            if (timeSelection?.option) {
              incrementCount(timeCounts, timeSelection.option);
              if (timeSelection.option === FAILURE_OTHER_OPTION_KEY) {
                const custom = sanitizeCustomValue(timeSelection.customValue);
                if (custom) {
                  customNotes.push({
                    id: `${challenge.id}-time`,
                    category: "時間帯",
                    value: custom,
                    recordedAt,
                  });
                }
              }
            }

            const deviceSelection = reflection.device;
            if (deviceSelection?.option) {
              incrementCount(deviceCounts, deviceSelection.option);
              if (deviceSelection.option === FAILURE_OTHER_OPTION_KEY) {
                const custom = sanitizeCustomValue(deviceSelection.customValue);
                if (custom) {
                  customNotes.push({
                    id: `${challenge.id}-device`,
                    category: "デバイス",
                    value: custom,
                    recordedAt,
                  });
                }
              }
            }

            const placeSelection = reflection.place;
            if (placeSelection?.option) {
              incrementCount(placeCounts, placeSelection.option);
              if (placeSelection.option === FAILURE_OTHER_OPTION_KEY) {
                const custom = sanitizeCustomValue(placeSelection.customValue);
                if (custom) {
                  customNotes.push({
                    id: `${challenge.id}-place`,
                    category: "場所",
                    value: custom,
                    recordedAt,
                  });
                }
              }
            }

            if (Array.isArray(reflection.feelings)) {
              reflection.feelings.forEach((feeling, index) => {
                if (!feeling.option) return;
                incrementCount(feelingCounts, feeling.option);
                if (feeling.option === FAILURE_OTHER_OPTION_KEY) {
                  const custom = sanitizeCustomValue(feeling.customValue);
                  if (custom) {
                    customNotes.push({
                      id: `${challenge.id}-feeling-${index}`,
                      category: "感情・状態",
                      value: custom,
                      recordedAt,
                    });
                  }
                }
              });
            }

            const freeNote = sanitizeCustomValue(reflection.otherNote);
            if (freeNote) {
              customNotes.push({
                id: `${challenge.id}-note`,
                category: "自由入力",
                value: freeNote,
                recordedAt,
              });
            }
          } else if (challenge.reflectionNote) {
            customNotes.push({
              id: `${challenge.id}-legacy`,
              category: "自由入力",
              value: challenge.reflectionNote,
              recordedAt,
            });
          }
        });

        const sortedNotes = customNotes
          .sort((a, b) => {
            const at = a.recordedAt ?? "";
            const bt = b.recordedAt ?? "";
            if (at === bt) return 0;
            return at > bt ? -1 : 1;
          })
          .slice(0, MAX_CUSTOM_NOTES);

        setSummary({
          time: toSummarySection(
            "時間帯（失敗発生時）",
            timeCounts,
            FAILURE_TIME_SLOTS,
          ),
          device: toSummarySection("デバイス", deviceCounts, FAILURE_DEVICES),
          place: toSummarySection("場所", placeCounts, FAILURE_PLACES),
          feelings: toSummarySection(
            "感情・状態",
            feelingCounts,
            FAILURE_FEELINGS,
          ),
          customNotes: sortedNotes,
          totalReflections,
        });
      } catch (error) {
        console.error("FailureSummaryScreen.fetch", error);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchSummary();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setStrategy("");
      setStrategyDraft("");
      setStrategyLoading(false);
      return;
    }

    let cancelled = false;
    const fetchStrategy = async () => {
      setStrategyLoading(true);
      try {
        const value = await FailureStrategyService.getStrategy(user.uid);
        if (cancelled) return;
        setStrategy(value);
        setStrategyDraft(value);
      } catch (error) {
        if (cancelled) return;
        console.error("FailureSummaryScreen.strategy", error);
      } finally {
        if (!cancelled) {
          setStrategyLoading(false);
        }
      }
    };

    void fetchStrategy();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const sections = useMemo(() => {
    if (!summary) return [];
    return [summary.time, summary.device, summary.place, summary.feelings];
  }, [summary]);

  const groupedNotes = useMemo(() => {
    if (!summary) return [];
    const order = ["時間帯", "デバイス", "場所", "感情・状態", "自由入力"];
    const map = new Map<string, CustomNote[]>();
    summary.customNotes.forEach((note) => {
      const list = map.get(note.category);
      if (list) {
        list.push(note);
      } else {
        map.set(note.category, [note]);
      }
    });
    return order
      .map((category) => ({ category, notes: map.get(category) ?? [] }))
      .filter((group) => group.notes.length > 0);
  }, [summary]);

  const hasStrategyChanges = useMemo(() => {
    return strategyDraft !== strategy;
  }, [strategy, strategyDraft]);

  const handleStrategyChange = useCallback((value: string) => {
    setStrategyDraft(value);
  }, []);

  const handleSaveStrategy = useCallback(async () => {
    if (!user?.uid || !hasStrategyChanges) return;

    setSavingStrategy(true);
    try {
      await FailureStrategyService.upsertStrategy(user.uid, strategyDraft);
      const trimmed = strategyDraft.trim();
      setStrategy(trimmed);
      setStrategyDraft(trimmed);
    } catch (error) {
      console.error("FailureSummaryScreen.saveStrategy", error);
      Alert.alert(
        "保存に失敗しました",
        "通信状況をご確認のうえ、もう一度お試しください。",
      );
    } finally {
      setSavingStrategy(false);
    }
  }, [hasStrategyChanges, strategyDraft, user?.uid]);

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBarComponent />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>原因サマリー</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loaderText}>読み込み中...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.strategyCard}>
            <View style={styles.strategyTitleWrapper}>
              <Ionicons
                name="bulb-outline"
                size={20}
                color={colors.primary}
                style={styles.strategyIcon}
              />
              <Text style={styles.strategyTitle}>戦略</Text>
            </View>
            {hasStrategyChanges ? (
              <Text style={styles.strategyStatus}>未保存の変更</Text>
            ) : null}
            {strategyLoading ? (
              <View style={styles.strategyLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  style={[styles.loaderText, styles.strategyLoaderText]}
                >
                  読み込み中...
                </Text>
              </View>
            ) : (
              <TextInput
                style={styles.strategyInput}
                multiline
                placeholder="分析結果を踏まえて、次の失敗を防ぐ戦略を書きましょう"
                placeholderTextColor={colors.textTertiary}
                value={strategyDraft}
                onChangeText={handleStrategyChange}
                textAlignVertical="top"
                autoCorrect={false}
              />
            )}
            <TouchableOpacity
              style={[
                styles.strategyButton,
                (!hasStrategyChanges || savingStrategy || strategyLoading) &&
                  styles.strategyButtonDisabled,
              ]}
              onPress={handleSaveStrategy}
              disabled={
                !hasStrategyChanges || savingStrategy || strategyLoading
              }
            >
              {savingStrategy ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={styles.strategyButtonText}>保存する</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.strategyHint}>
              ここにまとめた戦略はホーム画面でも確認できます。
            </Text>
          </View>

          {summary &&
          (summary.totalReflections > 0 || summary.customNotes.length > 0) ? (
            <>
              <Text style={styles.totalLabel}>
                これまでの失敗データ {summary.totalReflections} 件
              </Text>

              {sections.map((section) => (
                <View key={section.title} style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <Text style={styles.sectionTotal}>{section.total}件</Text>
                  </View>
                  {section.total > 0 ? (
                    section.items.map((item, index) => {
                      const percent = Math.round(item.ratio * 100);
                      const width = Math.min(
                        100,
                        Math.max(item.count > 0 ? 8 : 0, percent),
                      );
                      return (
                        <View
                          key={item.key}
                          style={[
                            styles.summaryRow,
                            index === 0 && styles.summaryRowFirst,
                          ]}
                        >
                          <Text style={styles.summaryLabel}>{item.label}</Text>
                          <Text style={styles.summaryRatio}>{percent}%</Text>
                          <View style={styles.progressBarTrack}>
                            <View
                              style={[
                                styles.progressBarFill,
                                {
                                  width: `${width}%`,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyMessage}>データがありません</Text>
                  )}
                </View>
              ))}

              {groupedNotes.length > 0 ? (
                <View style={styles.notesCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>その他メモ</Text>
                    <Text style={styles.sectionTotal}>
                      {summary.customNotes.length}件
                    </Text>
                  </View>
                  {groupedNotes.map((group) => (
                    <View key={group.category} style={styles.noteCategoryBlock}>
                      <View style={styles.noteCategoryHeader}>
                        <View style={styles.noteCategoryLeft}>
                          <View style={styles.noteCategoryBullet} />
                          <Text style={styles.noteCategoryHeading}>
                            {group.category}
                          </Text>
                        </View>
                        <View style={styles.noteCategoryCountBadge}>
                          <Text style={styles.noteCategoryCountText}>
                            {group.notes.length}
                          </Text>
                        </View>
                      </View>
                      {group.notes.map((note, index) => {
                        const timestamp = formatTimestamp(note.recordedAt);
                        return (
                          <View
                            key={note.id}
                            style={[
                              styles.noteItem,
                              index === 0 && styles.noteItemFirst,
                            ]}
                          >
                            <View style={styles.noteContent}>
                              <Text style={styles.noteValue}>{note.value}</Text>
                              {timestamp ? (
                                <Text style={styles.noteTimestamp}>
                                  {timestamp}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.emptyStateCard}>
              <Ionicons
                name="bar-chart-outline"
                size={36}
                color={colors.gray300}
                style={styles.emptyStateIcon}
              />
              <Text style={styles.emptyTitle}>まだ原因データがありません</Text>
              <Text style={styles.emptySubTitle}>
                履歴からチャレンジを停止するとまとめが表示されます。
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
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
    headerPlaceholder: {
      width: 32,
    },
    title: {
      fontSize: typography.fontSize["2xl"],
      fontWeight: "bold",
      color: colors.textPrimary,
      textAlign: "center",
      flex: 1,
    },
    loaderContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.xl,
    },
    loaderText: {
      marginTop: spacing.md,
      color: colors.textSecondary,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing["4xl"],
      paddingTop: spacing.xl,
    },
    totalLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
    sectionCard: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 16,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      shadowColor: colors.black,
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 16,
      elevation: 4,
      marginBottom: spacing["2xl"],
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    sectionTotal: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
    summaryRow: {
      borderTopWidth: 1,
      borderTopColor: colors.borderPrimary,
      paddingVertical: spacing.md,
    },
    summaryRowFirst: {
      borderTopWidth: 0,
      paddingTop: 0,
    },
    strategyCard: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 16,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      shadowColor: colors.shadowMedium,
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 14,
      elevation: 5,
      marginBottom: spacing["2xl"],
      alignItems: "center",
    },
    strategyTitleWrapper: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: spacing.xs,
      justifyContent: "center",
    },
    strategyIcon: {
      marginRight: spacing.xs,
    },
    strategyTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: "800",
      color: colors.textPrimary,
      textAlign: "center",
    },
    strategyInput: {
      minHeight: 96,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      borderRadius: 12,
      padding: spacing.md,
      fontSize: typography.fontSize.sm,
      color: colors.textPrimary,
      backgroundColor: colors.backgroundTertiary,
      marginTop: spacing.md,
      width: "100%",
      textAlign: "center",
    },
    strategyButton: {
      marginTop: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    strategyButtonDisabled: {
      backgroundColor: colors.gray300,
    },
    strategyButtonText: {
      color: colors.textInverse,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
    },
    strategyHint: {
      marginTop: spacing.sm,
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      textAlign: "center",
    },
    strategyStatus: {
      fontSize: typography.fontSize.xs,
      color: colors.warning,
      fontWeight: typography.fontWeight.semibold,
      alignSelf: "center",
      marginTop: spacing.xs,
      textAlign: "center",
      width: "100%",
    },
    strategyLoader: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.md,
    },
    strategyLoaderText: {
      marginTop: 0,
      marginLeft: spacing.sm,
      textAlign: "center",
    },
    summaryLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.medium,
    },
    summaryRatio: {
      marginTop: spacing.xs,
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
    progressBarTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.backgroundTertiary,
      overflow: "hidden",
      marginTop: spacing.sm,
    },
    progressBarFill: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    emptyMessage: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      textAlign: "center",
      paddingVertical: spacing.md,
    },
    notesCard: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 16,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      shadowColor: colors.black,
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 16,
      elevation: 4,
      marginTop: spacing["2xl"],
    },
    noteCategoryBlock: {
      marginTop: spacing.md,
    },
    noteCategoryHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.xs,
    },
    noteCategoryLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    noteCategoryHeading: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      fontWeight: typography.fontWeight.semibold,
      marginBottom: spacing.xs,
    },
    noteCategoryBullet: {
      width: 12,
      height: 12,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    noteCategoryCountBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
    },
    noteCategoryCountText: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      fontWeight: typography.fontWeight.medium,
    },
    noteItem: {
      borderTopWidth: 1,
      borderTopColor: colors.borderPrimary,
      paddingTop: spacing.md,
      marginTop: spacing.md,
    },
    noteItemFirst: {
      borderTopWidth: 0,
      paddingTop: 0,
      marginTop: 0,
    },
    noteContent: {
      flex: 1,
    },
    noteTimestamp: {
      fontSize: typography.fontSize.xs,
      color: colors.textTertiary,
      marginBottom: spacing.xs,
    },
    noteValue: {
      fontSize: typography.fontSize.base,
      color: colors.textPrimary,
      lineHeight: typography.lineHeight.normal * typography.fontSize.base,
    },
    emptyStateCard: {
      marginTop: spacing["2xl"],
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 16,
      paddingVertical: spacing["2xl"],
      paddingHorizontal: spacing.xl,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      alignItems: "center",
    },
    emptyStateIcon: {
      marginBottom: spacing.md,
    },
    emptyTitle: {
      fontSize: typography.fontSize.base,
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.semibold,
      marginTop: spacing.md,
    },
    emptySubTitle: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: typography.fontSize.sm * 1.4,
      marginTop: spacing.xs,
    },
  });

export default FailureSummaryScreen;
