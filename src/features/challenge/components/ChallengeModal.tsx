import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Pressable, FlatList } from "react-native";
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
  const dayOptions = useMemo(() => Array.from({ length: 1000 }, (_, i) => i + 1), []);
  React.useEffect(() => {
    if (!visible && daysPickerVisible) {
      setDaysPickerVisible(false);
    }
  }, [visible]);

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
          <Pressable
            style={({ pressed }) => [
              styles.selectField,
              pressed && styles.selectFieldPressed,
            ]}
            onPress={() => {
              try { console.log('日数選択フィールドがタップされました'); } catch {}
              setDaysPickerVisible(true);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.selectFieldText}>{goalDays}日</Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </Pressable>
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

        {/* 目標日数のインラインオーバーレイ（ネストModal回避） */}
        {daysPickerVisible && (
          <View style={styles.inlinePickerOverlay} pointerEvents="box-none">
            <Pressable style={styles.inlinePickerBackdrop} onPress={() => setDaysPickerVisible(false)} />
            <View style={styles.inlinePickerPanel}>
              <Text style={styles.inlinePickerTitle}>目標日数を選択</Text>
              <FlatList
                data={dayOptions}
                keyExtractor={(item) => String(item)}
                initialNumToRender={30}
                maxToRenderPerBatch={30}
                windowSize={6}
                bounces={false}
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
                    </TouchableOpacity>
                  );
                }}
                style={{ maxHeight: 320 }}
              />
              <View style={styles.modalButtons}>
                <Button
                  title="キャンセル"
                  onPress={() => setDaysPickerVisible(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        )}
      </Modal>
    </>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
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
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  inlinePickerPanel: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: spacing.md,
    maxHeight: 380,
  },
  inlinePickerTitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
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
    backgroundColor: colors.backgroundSecondary,
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
    backgroundColor: colors.backgroundSecondary,
    minHeight: 48, // タップしやすい高さを確保
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectFieldPressed: {
    backgroundColor: colors.backgroundTertiary,
    borderColor: colors.primary,
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
    backgroundColor: colors.backgroundSecondary,
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
