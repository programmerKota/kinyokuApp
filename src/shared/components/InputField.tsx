import React, { useMemo } from "react";
import type { TextInputProps, TextStyle } from "react-native";
import { View, Text, TextInput, StyleSheet } from "react-native";

import { spacing, typography, useAppTheme } from "@shared/theme";

interface InputFieldProps extends TextInputProps {
  label: string;
  description?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  textStyle?: TextStyle;
  unstyled?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  description,
  hint,
  error,
  required = false,
  style,
  textStyle,
  unstyled = false,
  ...textInputProps
}) => {
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const styles = useMemo(() => createStyles(mode), [mode]);

  if (unstyled) {
    return (
      <TextInput
        style={[textStyle, style]}
        placeholderTextColor={mode === "dark" ? "#9CA3AF" : "#94A3B8"}
        {...textInputProps}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <TextInput
        style={[styles.input, error && styles.inputError, style, textStyle]}
        placeholderTextColor={colors.textTertiary}
        {...textInputProps}
      />
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const createStyles = (mode: "light" | "dark") => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];

  return StyleSheet.create({
    container: {
      marginBottom: spacing.xl,
    },
    labelContainer: {
      marginBottom: 8,
    },
    label: {
      fontSize: typography.fontSize.base,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    required: {
      color: colors.error,
    },
    description: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      borderRadius: 8,
      padding: spacing.lg,
      fontSize: typography.fontSize.base,
      backgroundColor: colors.backgroundSecondary,
      color: colors.textPrimary,
    },
    inputError: {
      borderColor: colors.error,
      backgroundColor: colors.errorLight,
    },
    hint: {
      fontSize: typography.fontSize.xs,
      color: colors.textTertiary,
      marginTop: spacing.xs,
    },
    error: {
      fontSize: typography.fontSize.xs,
      color: colors.error,
      marginTop: spacing.xs,
    },
  });
};

export default InputField;
