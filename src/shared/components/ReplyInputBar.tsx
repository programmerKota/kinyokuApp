import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";

import { colors, spacing, typography } from "@shared/theme";
import { ReplyUiStore } from "@shared/state/replyUiStore";

interface ReplyInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void | Promise<void>;
  onCancel: () => void;
  autoFocus?: boolean;
  onFocus?: () => void;
}

const ReplyInputBar: React.FC<ReplyInputBarProps> = ({
  value,
  onChangeText,
  onSubmit,
  onCancel,
  autoFocus = false,
  onFocus,
}) => {
  const disabled = !value.trim();
  const onLayout = useCallback((e: any) => {
    try {
      const h = e?.nativeEvent?.layout?.height as number | undefined;
      if (h && h > 0) ReplyUiStore.setInputBarHeight(h);
    } catch {}
  }, []);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!autoFocus) return;
    // Focus reliably after mount/layout; try twice to avoid race with KAV/keyboard animations
    const t1 = setTimeout(() => inputRef.current?.focus(), 0);
    const t2 = setTimeout(() => inputRef.current?.focus(), 180);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [autoFocus]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={"返信を入力..."}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        multiline
        maxLength={280}
        autoFocus={autoFocus}
        onFocus={onFocus}
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
            送信
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
