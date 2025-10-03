import React from "react";
import { View, Text, StyleSheet } from "react-native";

import Button from "@shared/components/Button";
import Modal from "@shared/components/Modal";
import { colors, spacing, typography } from "@shared/theme";
import { formatDuration } from "@shared/utils/date";

interface CurrentSession {
  goalDays: number;
  penaltyAmount: number;
}

interface StopModalProps {
  visible: boolean;
  onClose: () => void;
  currentSession: CurrentSession | null;
  actualDuration: number;
  isGoalAchieved: boolean;
  onConfirm: () => void;
}

const StopModal: React.FC<StopModalProps> = ({
  visible,
  onClose,
  currentSession,
  actualDuration,
  isGoalAchieved,
  onConfirm,
}) => {
  return (
    <Modal visible={visible} onClose={onClose} title="チャレンジ停止">
      {currentSession ? (
        <View>
          <Text style={styles.modalMessage}>
            {isGoalAchieved
              ? "目標は達成済みです。停止して結果を確定しますか？\nペナルティは発生しません。"
              : "このまま停止するとペナルティが発生します。停止してもよろしいですか？"}
          </Text>

          <View style={styles.modalSummaryBox}>
            <Text style={styles.modalSummaryLabel}>現在の継続時間</Text>
            <Text style={styles.modalEmphasis}>
              {formatDuration(actualDuration)}
            </Text>

            <Text style={[styles.modalSummaryLabel, { marginTop: 8 }]}>
              目標
            </Text>
            <Text style={styles.modalEmphasis}>
              {currentSession.goalDays}日
            </Text>

            {!isGoalAchieved && (
              <Text
                style={[
                  styles.modalEmphasis,
                  styles.penaltyText,
                  { marginTop: 8 },
                ]}
              >
                ペナルティ: ¥{currentSession.penaltyAmount.toLocaleString()}
              </Text>
            )}
          </View>

          <View style={styles.modalButtons}>
            <Button
              title="キャンセル"
              onPress={onClose}
              variant="secondary"
              style={styles.modalButton}
            />
            <Button title="OK" onPress={onConfirm} style={styles.modalButton} />
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.modalMessage}>チャレンジを停止しますか？</Text>
          <View style={styles.modalButtons}>
            <Button
              title="キャンセル"
              onPress={onClose}
              variant="secondary"
              style={styles.modalButton}
            />
            <Button title="OK" onPress={onConfirm} style={styles.modalButton} />
          </View>
        </>
      )}
    </Modal>
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
    minWidth: 120,
  },
  modalMessage: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing["2xl"],
    lineHeight: typography.lineHeight.normal * typography.fontSize.base,
  },
  modalSummaryBox: {
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: spacing.lg,
  },
  modalSummaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  modalEmphasis: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  penaltyText: {
    color: colors.error,
  },
});

export default StopModal;
