import React from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";

import { colors, spacing, typography } from "@shared/theme";

interface ReplyInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void | Promise<void>;
  onCancel: () => void;
  autoFocus?: boolean;
}

const ReplyInputBar: React.FC<ReplyInputBarProps> = ({
  value,
  onChangeText,
  onSubmit,
  onCancel,
  autoFocus = false,
}) => {
  const disabled = !value.trim();
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="返信を入力..."
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        multiline
        maxLength={280}
        autoFocus={autoFocus}
      />
      <View style={styles.actions}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>キャンセル</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            void onSubmit();
          }}
          style={[styles.submitBtn, disabled && styles.submitBtnDisabled]}
          disabled={disabled}
        >
          <Text
            style={[styles.submitText, disabled && styles.submitTextDisabled]}
          >
            返信
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray50,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderPrimary,
  },
  input: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.md,
  },
  cancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  cancelText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  submitBtnDisabled: {
    backgroundColor: colors.gray300,
  },
  submitText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  submitTextDisabled: {
    color: colors.gray500,
  },
});

export default ReplyInputBar;
