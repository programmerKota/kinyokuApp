import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

import Button from "@shared/components/Button";
import Modal from "@shared/components/Modal";
import { spacing, typography, useAppTheme } from "@shared/theme";
import type { ColorPalette } from "@shared/theme/colors";

type Tone = "default" | "danger" | "warning" | "info";

interface ConfirmDialogProps {
  visible: boolean;
  onClose?: () => void;
  title: string;
  description?: string;
  message?: string;
  primaryLabel?: string;
  confirmText?: string;
  secondaryLabel?: string;
  cancelText?: string;
  onPrimary?: () => void | Promise<void>;
  onConfirm?: () => void | Promise<void>;
  onSecondary?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
}

const toneColor = (tone: Tone, colors: ColorPalette) => {
  switch (tone) {
    case "danger":
      return { fg: colors.error, bg: colors.errorLight };
    case "warning":
      return { fg: colors.warning, bg: colors.warningLight };
    case "info":
      return { fg: colors.info, bg: colors.infoLight };
    default:
      return { fg: colors.primary, bg: colors.primaryLight };
  }
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  onClose,
  title,
  description,
  message,
  primaryLabel,
  confirmText,
  secondaryLabel = "キャンセル",
  cancelText,
  onPrimary,
  onConfirm,
  onSecondary,
  onCancel,
  loading,
  icon = "alert-circle-outline",
  tone = "default",
}) => {
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const styles = useMemo(() => createStyles(mode), [mode]);

  const close = onClose || (() => {});
  const c = toneColor(tone, colors);
  const desc = description || message;
  const primaryText = primaryLabel || confirmText || "OK";
  const secondaryText = secondaryLabel || cancelText || "キャンセル";
  const handlePrimary = async () => {
    try {
      if (onPrimary) await onPrimary();
      else if (onConfirm) await onConfirm();
    } finally {
      close();
    }
  };
  const handleSecondary = async () => {
    try {
      if (onSecondary) await onSecondary();
      else if (onCancel) await onCancel();
    } finally {
      close();
    }
  };

  return (
    <Modal visible={visible} onClose={close} hideHeader>
      <View style={styles.container}>
        <View style={[styles.iconWrap, { backgroundColor: c.bg }]}>
          <Ionicons name={icon} size={28} color={c.fg} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {desc ? <Text style={styles.desc}>{desc}</Text> : null}
        <View style={styles.actions}>
          <Button
            title={secondaryText}
            variant="secondary"
            onPress={() => {
              void handleSecondary();
            }}
            style={styles.secondaryBtn}
          />
          <Button
            title={primaryText}
            variant={tone === "danger" ? "danger" : "primary"}
            onPress={() => {
              void handlePrimary();
            }}
            loading={!!loading}
          />
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (mode: "light" | "dark") => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];

  return StyleSheet.create({
    container: {
      alignItems: "stretch",
      paddingTop: spacing.xl,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
    },
    title: {
      marginTop: spacing.lg,
      fontSize: typography.fontSize.lg,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
    },
    desc: {
      marginTop: spacing.sm,
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      textAlign: "center",
    },
    actions: {
      marginTop: spacing["2xl"],
      width: "100%",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
    },
    secondaryBtn: {
      backgroundColor: "transparent",
    },
  });
};

export default ConfirmDialog;
