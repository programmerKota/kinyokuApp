import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import Button from "@shared/components/Button";
import Modal from "@shared/components/Modal";
import { colors, spacing, typography } from "@shared/theme";
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
  const [daysPickerVisible, setDaysPickerVisible] = useState(false);

  const penaltyOptions = paymentsConfig.penaltyOptions;

  return (
    <>
      <Modal visible={visible} onClose={onClose} title="チャレンジ設定">
        <View>
          <Text
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textSecondary,
              marginBottom: spacing.xs,
            }}
          >
            目標日数
          </Text>
          <TouchableOpacity
            style={styles.selectField}
            activeOpacity={0.8}
            onPress={() => setDaysPickerVisible(true)}
          >
            <Text style={styles.selectFieldText}>{goalDays}日</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Text
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textSecondary,
              marginBottom: spacing.xs,
            }}
          >
            ペナルティ金額
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
      </Modal>

      {/* 目標日数のプルダウン（リスト） */}
      <Modal
        visible={daysPickerVisible}
        onClose={() => setDaysPickerVisible(false)}
        title="目標日数を選択"
      >
        <View style={{ maxHeight: 360 }}>
          <View style={styles.daysList}>
            {Array.from({ length: 1000 }, (_, i) => i + 1).map((d) => {
              const selected = goalDays === d;
              return (
                <TouchableOpacity
                  key={d}
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
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing["2xl"],
  },
  modalButton: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  penaltyOptionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  penaltyChip: {
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
  },
  penaltyChipSelected: {
    backgroundColor: "#E5F2FF",
    borderColor: colors.info,
  },
  penaltyChipText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
  },
  penaltyChipTextSelected: {
    color: colors.info,
    fontWeight: "700",
  },
  selectField: {
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  selectFieldText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  daysList: {
    paddingVertical: spacing.xs,
  },
  dayRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    backgroundColor: colors.white,
  },
  dayRowSelected: {
    backgroundColor: "#E5F2FF",
  },
  dayRowText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  dayRowTextSelected: {
    color: colors.info,
    fontWeight: "700",
  },
});

export default ChallengeModal;
