import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Text, Alert, Image, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import Button from '@shared/components/Button';
import InputField from '@shared/components/InputField';
import Modal from '@shared/components/Modal';
import { colors, spacing, typography } from '@shared/theme';

const MAX_NAME_LENGTH = 8;

interface ProfileSetupModalProps {
  visible: boolean;
  initialName?: string;
  initialAvatar?: string;
  onSubmit: (name: string, avatar?: string) => Promise<void>;
  onSkip: () => void;
}

const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  visible,
  initialName = '',
  initialAvatar,
  onSubmit,
  onSkip,
}) => {
  const [name, setName] = useState(initialName);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(initialAvatar);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(initialName);
    setAvatarUri(initialAvatar);
    setErrorMessage(null);
    setSaving(false);
  }, [visible, initialName, initialAvatar]);

  const helperText = useMemo(() => {
    if (errorMessage) return errorMessage;
    return '\u203B 1\u301c8\u6587\u5b57\u3067\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002';
  }, [errorMessage]);

  const validateName = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return '\u30E6\u30FC\u30B6\u30FC\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002';
    if (trimmed.length > MAX_NAME_LENGTH) {
      return `\u30E6\u30FC\u30B6\u30FC\u540D\u306F${MAX_NAME_LENGTH}\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
    }
    return null;
  };

  const handlePickAvatar = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('\u8a31\u53ef\u304c\u5fc5\u8981\u3067\u3059', '\u5199\u771f\u30e9\u30a4\u30d6\u30e9\u30ea\u3078\u306e\u30a2\u30af\u30bb\u30b9\u3092\u8a31\u53ef\u3057\u3066\u304f\u3060\u3055\u3044\u3002');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setAvatarUri(res.assets[0].uri);
      }
    } catch (e) {
      console.warn('ProfileSetupModal: image pick failed', e);
    }
  }, []);

  const saveProfile = useCallback(async () => {
    if (saving) return;
    const validationResult = validateName(name);
    if (validationResult) {
      setErrorMessage(validationResult);
      return;
    }

    setErrorMessage(null);
    setSaving(true);
    try {
      await onSubmit(name.trim(), avatarUri);
    } catch (err) {
      console.error('ProfileSetupModal: save failed', err);
      Alert.alert('\u30A8\u30E9\u30FC', '\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u306E\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u901A\u4FE1\u72B6\u6CC1\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002');
      setSaving(false);
      return;
    }
    setSaving(false);
  }, [saving, name, avatarUri, onSubmit]);

  const handleSkip = useCallback(() => {
    if (saving) return;
    onSkip();
  }, [saving, onSkip]);

  return (
    <Modal visible={visible} onClose={handleSkip} title={'\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u3092\u8A2D\u5B9A'}>
      <View style={styles.content}>
        <Text style={styles.description}>
          {'\u306F\u3058\u3081\u307E\u3057\u3066\uFF01\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u3067\u8868\u793A\u3059\u308B\u30E6\u30FC\u30B6\u30FC\u540D\u3092\u6559\u3048\u3066\u304F\u3060\u3055\u3044\u3002\u5F8C\u304B\u3089\u8A2D\u5B9A\u753B\u9762\u3067\u5909\u66F4\u3059\u308B\u3053\u3068\u3082\u53EF\u80FD\u3067\u3059\u3002'}
        </Text>

        <View style={styles.avatarRow}>
          <TouchableOpacity onPress={() => { void handlePickAvatar(); }}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
          </TouchableOpacity>
          {avatarUri ? (
            <Button title={'\u524A\u9664'} variant='secondary' onPress={() => setAvatarUri(undefined)} />
          ) : (
            <Button title={'\u753B\u50CF\u3092\u9078\u629E'} onPress={() => { void handlePickAvatar(); }} />
          )}
        </View>

        <InputField
          label={'\u30E6\u30FC\u30B6\u30FC\u540D'}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder={`${MAX_NAME_LENGTH}\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B`}
          autoFocus
        />
        <Text style={[styles.helperText, errorMessage ? styles.helperTextError : undefined]}>{helperText}</Text>

        <View style={styles.actions}>
          <Button title={'\u3042\u3068\u3067'} variant='secondary' onPress={handleSkip} style={styles.button} disabled={saving} />
          <Button title={saving ? '\u4FDD\u5B58\u4E2D...' : '\u4FDD\u5B58\u3059\u308B'} onPress={() => { void saveProfile(); }} style={styles.button} disabled={saving} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing['2xl'],
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.base * 1.5,
    marginBottom: spacing.lg,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray200,
  },
  avatarPlaceholder: {
    backgroundColor: colors.gray200,
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
    columnGap: spacing.md,
    marginTop: spacing['2xl'],
  },
  button: {
    minWidth: 120,
  },
});

export default ProfileSetupModal;
