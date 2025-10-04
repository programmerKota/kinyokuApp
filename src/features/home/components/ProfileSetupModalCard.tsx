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

  const sanitize = (s?: string) =>
    s && /[\uFFFD]/.test(s) ? "" : s || "";

  useEffect(() => {
    if (!visible) return;
    setName(sanitize(initialName));
    setAvatarUri(initialAvatar);
    setErrorMessage(null);
    setSaving(false);
  }, [visible, initialName, initialAvatar]);

  const nameLength = useMemo(() => name.trim().length, [name]);

  const validateName = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return "ユーザー名を入力してください。";
    if (trimmed.length > MAX_NAME_LENGTH) {
      return `ユーザー名は${MAX_NAME_LENGTH}文字以内で入力してください。`;
    }
    return null;
  };

  const handlePickAvatar = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "許可が必要です",
          "写真ライブラリへのアクセスを許可してください。",
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
        "エラー",
        "プロフィールの保存に失敗しました。通信状況を確認ください。",
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

  const isNameValid =
    name.trim().length > 0 && name.trim().length <= MAX_NAME_LENGTH;

  return (
    <Modal visible={visible} onClose={handleSkip} title={"プロフィール設定"}>
      <View style={styles.content}>
        <View style={styles.avatarWrapper}>
          <TouchableOpacity
            onPress={() => {
              void handlePickAvatar();
            }}
            activeOpacity={0.8}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarLarge} />
            ) : (
              <View style={[styles.avatarLarge, styles.avatarPlaceholder]}>
                <Ionicons
                  name="person"
                  size={42}
                  color={colors.textSecondary}
                />
              </View>
            )}
          </TouchableOpacity>
          {avatarUri && (
            <TouchableOpacity
              style={[styles.badge, styles.badgeDelete]}
              onPress={() => setAvatarUri(undefined)}
            >
              <Ionicons name="close" size={14} color={colors.white} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.badge, styles.badgeEdit]}
            onPress={() => {
              void handlePickAvatar();
            }}
          >
            <Ionicons name="create" size={14} color={colors.white} />
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
          placeholder="ユーザー名"
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          underlineColorAndroid="transparent"
          onSubmitEditing={() => {
            if (isNameValid) {
              void saveProfile();
            }
          }}
        />
        <View style={styles.underline} />
        {errorMessage ? (
          <Text style={[styles.counter, { color: colors.error }]}>
            {errorMessage}
          </Text>
        ) : (
          <Text
            style={styles.counter}
          >{`${Math.min(nameLength, MAX_NAME_LENGTH)} /${MAX_NAME_LENGTH}`}</Text>
        )}

        <View style={styles.actions}>
          <Button
            title={"キャンセル"}
            variant="secondary"
            onPress={handleSkip}
            style={styles.button}
            disabled={saving}
          />
          <Button
            title={saving ? "保存中..." : "保存"}
            onPress={() => {
              void saveProfile();
            }}
            style={styles.button}
            disabled={saving || !isNameValid}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing["2xl"],
    alignItems: "center",
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.borderPrimary,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: spacing.xl,
    backgroundColor: colors.white,
  },
  avatarLarge: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 56,
  },
  badge: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  badgeDelete: {
    backgroundColor: colors.error,
    left: -6,
    top: -6,
  },
  badgeEdit: {
    backgroundColor: colors.primary,
    right: -6,
    bottom: -6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  nameInput: {
    width: "80%",
    textAlign: "center",
    fontSize: typography.fontSize.lg,
    color: colors.textPrimary,
  },
  underline: {
    width: "80%",
    height: 2,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  counter: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    columnGap: spacing.lg,
    marginTop: spacing.xl,
  },
  button: {
    minWidth: 120,
  },
});

export default ProfileSetupModal;

