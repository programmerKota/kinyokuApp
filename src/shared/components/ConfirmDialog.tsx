import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { colors, spacing, typography } from "@shared/theme";

import Button from "./Button";
import Modal from "./Modal";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = "OK",
  cancelText = "キャンセル",
  onConfirm,
  onCancel,
  loading = false,
}) => {
  return (
    <Modal visible={visible} onClose={onCancel} title={title}>
      <View style={styles.body}>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.actions}>
          <Button
            title={cancelText}
            variant="secondary"
            onPress={onCancel}
            style={styles.btn}
          />
          <Button
            title={confirmText}
            variant="danger"
            onPress={onConfirm}
            loading={loading}
            style={styles.btn}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingTop: spacing.sm,
  },
  message: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.base * 1.5,
    marginBottom: spacing["2xl"],
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
  },
  btn: {
    minWidth: 112,
  },
});

export default ConfirmDialog;
