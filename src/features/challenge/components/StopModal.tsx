import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  FAILURE_DEVICES,
  FAILURE_FEELINGS,
  FAILURE_OTHER_LABEL,
  FAILURE_OTHER_OPTION_KEY,
  FAILURE_PLACES,
  FAILURE_TIME_SLOTS,
} from "@features/challenge/constants/failureReflectionOptions";
import type {
  FailureDeviceKey,
  FailureFeelingKey,
  FailureOtherKey,
  FailurePlaceKey,
  FailureSingleOptionSelection,
  FailureTimeSlotKey,
} from "@project-types";
import Button from "@shared/components/Button";
import Modal from "@shared/components/Modal";
import { spacing, typography, useAppTheme } from "@shared/theme";
import { formatDuration } from "@shared/utils/date";
import type { ColorPalette } from "@shared/theme/colors";

type SetStateAction<T> = React.SetStateAction<T>;

type Dispatch<T> = React.Dispatch<SetStateAction<T>>;

const withOtherOption = <T extends { key: string; label: string }>(
  options: readonly T[],
) => [
  ...options,
  { key: FAILURE_OTHER_OPTION_KEY, label: FAILURE_OTHER_LABEL },
];

type FeelingKey = FailureFeelingKey | FailureOtherKey;
type SingleFieldKey = "timeSlot" | "device" | "place";
type CombinedOption =
  | FailureTimeSlotKey
  | FailureDeviceKey
  | FailurePlaceKey
  | FailureOtherKey;

export interface FailureReflectionFormState {
  timeSlot: FailureSingleOptionSelection<FailureTimeSlotKey>;
  device: FailureSingleOptionSelection<FailureDeviceKey>;
  place: FailureSingleOptionSelection<FailurePlaceKey>;
  feelings: {
    selected: FeelingKey[];
    otherValue: string;
  };
  otherNote: string;
}

const ensureUnique = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

interface StopModalProps {
  visible: boolean;
  onClose: () => void;
  currentSession: { goalDays: number; penaltyAmount: number } | null;
  actualDuration: number;
  isGoalAchieved: boolean;
  onConfirm: () => void;
  confirmDisabled: boolean;
  reflection: FailureReflectionFormState;
  onChangeReflection: Dispatch<FailureReflectionFormState>;
}

const StopModal: React.FC<StopModalProps> = ({
  visible,
  onClose,
  currentSession,
  actualDuration,
  isGoalAchieved,
  onConfirm,
  confirmDisabled,
  reflection,
  onChangeReflection,
}) => {
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSingleSelect = (
    field: SingleFieldKey,
    option: CombinedOption,
  ) => {
    onChangeReflection((prev) => {
      const customValue =
        option === FAILURE_OTHER_OPTION_KEY
          ? prev[field].customValue ?? ""
          : "";
      return {
        ...prev,
        [field]: {
          option,
          customValue,
        },
      } as FailureReflectionFormState;
    });
  };

  const handleSingleCustomChange = (
    field: SingleFieldKey,
    value: string,
  ) => {
    onChangeReflection((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        customValue: value,
      },
    }) as FailureReflectionFormState);
  };

  const toggleFeeling = (key: FeelingKey) => {
    onChangeReflection((prev) => {
      const alreadySelected = prev.feelings.selected.includes(key);
      const selected = alreadySelected
        ? prev.feelings.selected.filter((item) => item !== key)
        : ensureUnique([...prev.feelings.selected, key]);
      const otherValue = selected.includes(FAILURE_OTHER_OPTION_KEY)
        ? prev.feelings.otherValue
        : "";
      return {
        ...prev,
        feelings: {
          selected,
          otherValue,
        },
      };
    });
  };

  const handleFeelingOtherChange = (value: string) => {
    onChangeReflection((prev) => ({
      ...prev,
      feelings: {
        selected: ensureUnique([
          ...prev.feelings.selected,
          FAILURE_OTHER_OPTION_KEY,
        ]),
        otherValue: value,
      },
    }));
  };

  const sections = useMemo(
    () => [
      {
        title: "時間帯（失敗発生時）",
        options: withOtherOption(FAILURE_TIME_SLOTS),
        field: "timeSlot" as const,
        placeholder: "時間帯を入力",
      },
      {
        title: "デバイス",
        options: withOtherOption(FAILURE_DEVICES),
        field: "device" as const,
        placeholder: "デバイスを入力",
      },
      {
        title: "場所",
        options: withOtherOption(FAILURE_PLACES),
        field: "place" as const,
        placeholder: "場所を入力",
      },
    ],
    [],
  );

  return (
    <Modal visible={visible} onClose={onClose} title="チャレンジ停止">
      {currentSession ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
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

            {!isGoalAchieved ? (
              <View>
                {sections.map(({ title, options, field, placeholder }) => {
                  const current = reflection[field];
                  const otherSelected =
                    current.option === FAILURE_OTHER_OPTION_KEY;
                  return (
                    <View key={field} style={styles.section}>
                      <Text style={styles.sectionTitle}>{title}</Text>
                      <View style={styles.optionWrap}>
                        {options.map((option) => {
                          const isSelected = current.option === option.key;
                          return (
                            <TouchableOpacity
                              key={option.key}
                              style={[
                                styles.optionChip,
                                isSelected && styles.optionChipSelected,
                              ]}
                              activeOpacity={0.8}
                              onPress={() =>
                                handleSingleSelect(field, option.key)
                              }
                            >
                              <Text
                                style={[
                                  styles.optionChipText,
                                  isSelected && styles.optionChipTextSelected,
                                ]}
                              >
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {otherSelected ? (
                        <TextInput
                          value={current.customValue ?? ""}
                          onChangeText={(value) =>
                            handleSingleCustomChange(field, value)
                          }
                          style={styles.optionInput}
                          placeholder={`${placeholder}`}
                          placeholderTextColor={colors.textTertiary}
                        />
                      ) : null}
                    </View>
                  );
                })}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    感情・状態（複数選択可）
                  </Text>
                  <View style={styles.optionWrap}>
                    {withOtherOption(FAILURE_FEELINGS).map((option) => {
                      const isSelected = reflection.feelings.selected.includes(
                        option.key as FeelingKey,
                      );
                      return (
                        <TouchableOpacity
                          key={option.key}
                          style={[
                            styles.optionChip,
                            isSelected && styles.optionChipSelected,
                          ]}
                          activeOpacity={0.8}
                          onPress={() =>
                            toggleFeeling(option.key as FeelingKey)
                          }
                        >
                          <Text
                            style={[
                              styles.optionChipText,
                              isSelected && styles.optionChipTextSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {reflection.feelings.selected.includes(
                    FAILURE_OTHER_OPTION_KEY,
                  ) ? (
                    <TextInput
                      value={reflection.feelings.otherValue}
                      onChangeText={handleFeelingOtherChange}
                      style={styles.optionInput}
                      placeholder="感情・状態を入力"
                      placeholderTextColor={colors.textTertiary}
                      multiline
                    />
                  ) : null}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>自由入力メモ</Text>
                  <TextInput
                    value={reflection.otherNote}
                    onChangeText={(value) =>
                      onChangeReflection((prev) => ({
                        ...prev,
                        otherNote: value,
                      }))
                    }
                    style={[styles.optionInput, { minHeight: 96 }]}
                    placeholder="その他の気づきを記録してください"
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.modalButtons}>
            <Button
              title="キャンセル"
              onPress={onClose}
              variant="secondary"
              style={styles.modalButton}
            />
            <Button
              testID="confirm-btn"
              title="OK"
              onPress={onConfirm}
              disabled={confirmDisabled}
              style={styles.modalButton}
            />
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

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    scrollContent: {
      paddingBottom: spacing.xl,
    },
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
    section: {
      marginTop: spacing["2xl"],
    },
    sectionTitle: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      fontWeight: typography.fontWeight.semibold,
    },
    optionWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -spacing.xs,
    },
    optionChip: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: 999,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      marginHorizontal: spacing.xs,
      marginBottom: spacing.xs,
    },
    optionChipSelected: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    optionChipText: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      fontWeight: typography.fontWeight.medium,
    },
    optionChipTextSelected: {
      color: colors.primary,
    },
    optionInput: {
      marginTop: spacing.sm,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      padding: spacing.md,
      color: colors.textPrimary,
      backgroundColor: colors.backgroundSecondary,
    },
  });

export default StopModal;
