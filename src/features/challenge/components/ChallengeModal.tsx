import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  FlatList,
  Modal as RNModal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Button from "@shared/components/Button";
import Modal from "@shared/components/Modal";
import { spacing, typography, useAppTheme } from "@shared/theme";
import { paymentsConfig } from "@app/config/payments.config";

interface ChallengeModalProps {
  visible: boolean;
  onClose: () => void;
  goalDays: number;
  penaltyAmount: number;
  onGoalDaysChange: (days: number) => void;
  onPenaltyAmountChange: (amount: number) => void;
  onStart: () => void;
  isStarting: boolean;
}

const ChallengeModal: React.FC<ChallengeModalProps> = ({
  visible,
  onClose,
  goalDays,
  penaltyAmount,
  onGoalDaysChange,
  onPenaltyAmountChange,
  onStart,
  isStarting,
}) => {
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [daysPickerVisible, setDaysPickerVisible] = useState(false);
  const dayOptions = useMemo(
    () => Array.from({ length: 1000 }, (_, i) => i + 1),
    [],
  );

  // よく使われる日数のクイック選択オプション
  const quickDayOptions = [1, 3, 7, 14, 21, 30, 60, 90];

  React.useEffect(() => {
    if (!visible && daysPickerVisible) {
      setDaysPickerVisible(false);
    }
  }, [visible]);

  const penaltyOptions = paymentsConfig.penaltyOptions;

  return (
    <>
      <Modal
        visible={visible}
        onClose={onClose}
        title="チャレンジ設定"
        scrollable={true}
        maxWidth={520}
      >
        <View style={styles.modalContent}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>目標日数</Text>
            </View>

            {/* クイック選択オプション */}
            <View style={styles.quickOptionsContainer}>
              <Text style={styles.quickOptionsLabel}>よく使われる期間</Text>
              <View style={styles.quickOptionsRow}>
                {quickDayOptions.map((days) => {
                  const selected = goalDays === days;
                  return (
                    <TouchableOpacity
                      key={days}
                      style={[
                        styles.quickOptionChip,
                        selected && styles.quickOptionChipSelected,
                      ]}
                      onPress={() => onGoalDaysChange(days)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.quickOptionChipText,
                          selected && styles.quickOptionChipTextSelected,
                        ]}
                      >
                        {days}日
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* カスタム日数選択 */}
            <Pressable
              style={({ pressed }) => [
                styles.selectField,
                pressed && styles.selectFieldPressed,
              ]}
              onPress={() => {
                try {
                  console.log("日数選択フィールドがタップされました");
                } catch {}
                setDaysPickerVisible(true);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.selectFieldContent}>
                <Ionicons
                  name="create"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={styles.selectFieldText}>
                  カスタム: {goalDays}日
                </Text>
              </View>
              <Ionicons
                name="chevron-down"
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card" size={20} color={colors.warning} />
              <Text style={styles.sectionTitle}>ペナルティ金額</Text>
            </View>
            <Text style={styles.sectionDescription}>
              目標を達成できなかった場合のペナルティ金額を設定します
            </Text>
            <View style={styles.penaltyOptionsRow}>
              {penaltyOptions.map((amount) => {
                const selected = penaltyAmount === amount;
                return (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.penaltyChip,
                      selected && styles.penaltyChipSelected,
                    ]}
                    onPress={() => onPenaltyAmountChange(amount)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.penaltyChipText,
                        selected && styles.penaltyChipTextSelected,
                      ]}
                    >
                      ¥{amount.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.modalButtons}>
          <Button
            title="キャンセル"
            onPress={onClose}
            variant="secondary"
            style={styles.modalButton}
          />
          <Button
            title="開始"
            onPress={onStart}
            style={styles.modalButton}
            disabled={isStarting}
            loading={isStarting}
          />
        </View>

        {/* 目標日数のオーバーレイは RNModal でポータル表示し、ScrollView ネストを回避 */}
        <RNModal
          visible={daysPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDaysPickerVisible(false)}
        >
          <View style={styles.inlinePickerOverlay} pointerEvents="box-none">
            <Pressable
              style={styles.inlinePickerBackdrop}
              onPress={() => setDaysPickerVisible(false)}
            />
            <View style={styles.inlinePickerPanel}>
              <View style={styles.inlinePickerHeader}>
                <Ionicons name="calendar" size={24} color={colors.primary} />
                <Text style={styles.inlinePickerTitle}>カスタム日数を選択</Text>
              </View>
              <Text style={styles.inlinePickerSubtitle}>
                1日から1000日まで選択できます
              </Text>
              <FlatList
                data={dayOptions}
                keyExtractor={(item) => String(item)}
                initialNumToRender={30}
                maxToRenderPerBatch={30}
                windowSize={6}
                bounces={false}
                showsVerticalScrollIndicator
                renderItem={({ item: d }) => {
                  const selected = goalDays === d;
                  return (
                    <TouchableOpacity
                      style={[styles.dayRow, selected && styles.dayRowSelected]}
                      onPress={() => {
                        onGoalDaysChange(d);
                        setDaysPickerVisible(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.dayRowText,
                          selected && styles.dayRowTextSelected,
                        ]}
                      >
                        {d}日
                      </Text>
                      {selected && (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
                style={{ maxHeight: 280 }}
              />
              <View style={styles.inlinePickerButtons}>
                <Button
                  title="キャンセル"
                  onPress={() => setDaysPickerVisible(false)}
                  variant="secondary"
                  style={styles.inlinePickerButton}
                />
              </View>
            </View>
          </View>
        </RNModal>
      </Modal>
    </>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    // モーダルコンテンツ
    modalContent: {
      flexGrow: 1,
    },

    // セクション関連
    section: {
      marginBottom: spacing.xl,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: "600",
      color: colors.textPrimary,
      marginLeft: spacing.sm,
    },
    sectionDescription: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: spacing.md,
      lineHeight: 20,
    },

    // クイック選択オプション
    quickOptionsContainer: {
      marginBottom: spacing.md,
    },
    quickOptionsLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    quickOptionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    quickOptionChip: {
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      borderRadius: 20,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.backgroundSecondary,
    },
    quickOptionChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    quickOptionChipText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      fontWeight: "500",
    },
    quickOptionChipTextSelected: {
      color: colors.white,
      fontWeight: "600",
    },

    // 選択フィールド
    selectField: {
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: colors.backgroundSecondary,
      minHeight: 48,
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    selectFieldPressed: {
      backgroundColor: colors.backgroundTertiary,
      borderColor: colors.primary,
    },
    selectFieldContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    selectFieldText: {
      fontSize: typography.fontSize.base,
      color: colors.textPrimary,
      marginLeft: spacing.sm,
    },

    // ペナルティオプション
    penaltyOptionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    penaltyChip: {
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      borderRadius: 20,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.backgroundSecondary,
    },
    penaltyChipSelected: {
      backgroundColor: colors.warningLight,
      borderColor: colors.warning,
    },
    penaltyChipText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      fontWeight: "600",
    },
    penaltyChipTextSelected: {
      color: colors.warning,
      fontWeight: "700",
    },

    // モーダルボタン
    modalButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacing["2xl"],
    },
    modalButton: {
      flex: 1,
      marginHorizontal: spacing.sm,
    },

    // インラインピッカー
    inlinePickerOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 50,
      justifyContent: "center",
      alignItems: "center",
    },
    inlinePickerBackdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    inlinePickerPanel: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 16,
      padding: spacing.lg,
      maxHeight: 400,
      shadowColor: colors.shadowDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    inlinePickerHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    inlinePickerTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: "600",
      color: colors.textPrimary,
      marginLeft: spacing.sm,
    },
    inlinePickerSubtitle: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: spacing.md,
      textAlign: "center",
    },
    inlinePickerButtons: {
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderPrimary,
    },
    inlinePickerButton: {
      width: "100%",
    },
    dayRow: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
      backgroundColor: colors.backgroundSecondary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    dayRowSelected: {
      backgroundColor: colors.primaryLight,
    },
    dayRowText: {
      fontSize: typography.fontSize.base,
      color: colors.textPrimary,
    },
    dayRowTextSelected: {
      color: colors.primary,
      fontWeight: "600",
    },
  });

export default ChallengeModal;
