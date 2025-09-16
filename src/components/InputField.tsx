import React from 'react';
import { colors, spacing, typography } from '../theme';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TextInputProps,
    TextStyle,
} from 'react-native';

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
    if (unstyled) {
        return (
            <TextInput
                style={[textStyle, style]}
                placeholderTextColor="#9CA3AF"
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
                {description && (
                    <Text style={styles.description}>{description}</Text>
                )}
            </View>
            <TextInput
                style={[
                    styles.input,
                    error && styles.inputError,
                    style,
                    textStyle,
                ]}
                placeholderTextColor={colors.textTertiary}
                {...textInputProps}
            />
            {hint && !error && (
                <Text style={styles.hint}>{hint}</Text>
            )}
            {error && (
                <Text style={styles.error}>{error}</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.xl,
    },
    labelContainer: {
        marginBottom: 8,
    },
    label: {
        fontSize: typography.fontSize.base,
        fontWeight: 'bold',
        color: colors.gray800,
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
        color: colors.gray800,
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

export default InputField;
