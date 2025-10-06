import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  Alert,
  Image,
  TouchableOpacity,
  TextInput,
} from "react-native";

import Button from "@shared/components/Button";
import Modal from "@shared/components/Modal";
import { colors, spacing, typography } from "@shared/theme";

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
  initialName = "",
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

  const nameLength = useMemo(() => name.trim().length, [name]);

  const validateName = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length === 0)
      return "\u30E6\u30FC\u30B6\u30FC\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
    if (trimmed.length > MAX_NAME_LENGTH) {
      return `\u30E6\u30FC\u30B6\u30FC\u540D\u306F${MAX_NAME_LENGTH}\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
    }
    return null;
  };

  const handlePickAvatar = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "\u8a31\u53ef\u304c\u5fc5\u8981\u3067\u3059",
          "\u5199\u771f\u30e9\u30a4\u30d6\u30e9\u30ea\u3078\u306e\u30a2\u30af\u30bb\u30b9\u3092\u8a31\u53ef\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
        );
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
      console.warn("ProfileSetupModal: image pick failed", e);
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
      console.error("ProfileSetupModal: save failed", err);
      Alert.alert(
        "\u30A8\u30E9\u30FC",
        "\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u306E\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u901A\u4FE1\u72B6\u6CC1\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002",
      );
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
    <Modal
      visible={visible}
      onClose={handleSkip}
      title={"\\u30D7\\u30ED\\u30D5\\u30A3\\u30FC\\u30EB\\u8A2D\\u5B9A"}
    >
      <View style={styles.content}>
        <Text style={styles.description}>
          {
            "\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u540D\u3068\u30A2\u30A4\u30B3\u30F3\u3092\u8A2D\u5B9A\u3057\u307E\u3059"
          }
        </Text>
        <View style={styles.avatarRow}>
          <TouchableOpacity
            onPress={() => {
              void handlePickAvatar();
            }}
            activeOpacity={0.8}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons
                  name="person"
                  size={42}
                  color={colors.textSecondary}
                />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errorMessage) setErrorMessage(null);
          }}
          autoFocus
          placeholder={"\u540D\u524D"}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          maxLength={MAX_NAME_LENGTH}
        />
        <View style={styles.underline} />
        {errorMessage ? (
          <Text style={[styles.counter, { color: colors.error }]}>
            {errorMessage}
          </Text>
        ) : (
          <Text
            style={styles.counter}
          >{`${nameLength}/${MAX_NAME_LENGTH}`}</Text>
        )}

        <View style={styles.actions}>
          <Button
            title={"\u30AD\u30E3\u30F3\u30BB\u30EB"}
            variant="secondary"
            onPress={handleSkip}
            style={styles.button}
            disabled={saving}
          />
          <Button
            title={saving ? "\u4FDD\u5B58\u4E2D..." : "\u4FDD\u5B58"}
            onPress={() => {
              void saveProfile();
            }}
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
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
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
  nameInput: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  underline: {
    height: 1,
    backgroundColor: colors.borderPrimary,
    marginTop: 2,
  },
  counter: {
    alignSelf: "flex-end",
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
    columnGap: spacing.md,
    marginTop: spacing["2xl"],
  },
  button: {
    minWidth: 120,
  },
});

export default ProfileSetupModal;
