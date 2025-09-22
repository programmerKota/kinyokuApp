import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Text, Alert } from "react-native";

import Button from "@shared/components/Button";
import InputField from "@shared/components/InputField";
import Modal from "@shared/components/Modal";
import { colors, spacing, typography } from "@shared/theme";

const MAX_NAME_LENGTH = 8;

interface ProfileSetupModalProps {
  visible: boolean;
  initialName?: string;
  onSubmit: (name: string) => Promise<void>;
  onSkip: () => void;
}

const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  visible,
  initialName = "",
  onSubmit,
  onSkip,
}) => {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(initialName);
    setError(null);
    setSaving(false);
  }, [visible, initialName]);

  const helperText = useMemo(() => {
    if (error) return error;
    return "�� 1?8�����œ��͂��Ă��������B";
  }, [error]);

  const validate = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return "���[�U�[������͂��Ă��������B";
    if (trimmed.length > MAX_NAME_LENGTH)
      return `���[�U�[����${MAX_NAME_LENGTH}�����ȓ��œ��͂��Ă��������B`;
    return null;
  };

  const handleSave = async () => {
    if (saving) return;
    const message = validate(name);
    if (message) {
      setError(message);
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSubmit(name.trim());
      setSaving(false);
    } catch (err) {
      console.error("ProfileSetupModal: �ۑ��Ɏ��s���܂���", err);
      Alert.alert(
        "�G���[",
        "�v���t�B�[���̕ۑ��Ɏ��s���܂����B�ʐM�󋵂����m�F���������B",
      );
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (saving) return;
    onSkip();
  };

  return (
    <Modal visible={visible} onClose={handleSkip} title="�v���t�B�[����ݒ�">
      <View style={styles.content}>
        <Text style={styles.description}>
          �͂��߂܂��āI�R�~���j�e�B�ŕ\�����郆�[�U�[���������Ă��������B
          �ォ��ݒ��ʂŕύX���邱�Ƃ��ł��܂��B
        </Text>
        <InputField
          label="���[�U�[��"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (error) setError(null);
          }}
          placeholder={`${MAX_NAME_LENGTH}�����ȓ�`}
          autoFocus
        />
        <Text
          style={[
            styles.helperText,
            error ? styles.helperTextError : undefined,
          ]}
        >
          {helperText}
        </Text>

        <View style={styles.actions}>
          <Button
            title="���Ƃ�"
            variant="secondary"
            onPress={handleSkip}
            style={styles.button}
            disabled={saving}
          />
          <Button
            title={saving ? "�ۑ���..." : "�ۑ�����"}
            onPress={handleSave}
            style={styles.button}
            disabled={saving}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing["2xl"],
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.base * 1.5,
    marginBottom: spacing.lg,
  },
  helperText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  helperTextError: {
    color: colors.error,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
    marginTop: spacing["2xl"],
  },
  button: {
    minWidth: 120,
  },
});

export default ProfileSetupModal;
