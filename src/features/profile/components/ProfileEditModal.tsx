import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { View, Image, TouchableOpacity, StyleSheet, Text } from "react-native";

import useProfileScreen from "@features/profile/hooks/useProfileScreen";
import Button from "@shared/components/Button";
import InputField from "@shared/components/InputField";
import Modal from "@shared/components/Modal";
import { spacing, typography, useAppTheme } from "@shared/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

// A reusable modal that renders the same edit UI used on ProfileScreen
const ProfileEditModal: React.FC<Props> = ({ visible, onClose, onSaved }) => {
  const [state, actions] = useProfileScreen();
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];
  const styles = React.useMemo(() => createStyles(mode), [mode]);

  const { editName, editAvatar, loading } = state;
  const {
    setEditName,
    handleImagePicker,
    handleRemoveImage,
    handleSaveProfile,
  } = actions;

  useEffect(() => {
    // No-op: useProfileScreen initializes fields from current user
  }, [visible]);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="プロフィール設定"
      maxWidth={520}
    >
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            onPress={() => {
              void handleImagePicker();
            }}
            style={styles.avatarEditContainer}
            activeOpacity={0.85}
          >
            {editAvatar ? (
              <>
                <Image source={{ uri: editAvatar }} style={styles.avatar} />
                <TouchableOpacity
                  onPress={handleRemoveImage}
                  style={[styles.overlayButton, styles.removeIconOverlay]}
                  accessibilityLabel="画像を削除"
                >
                  <Ionicons name="close" size={18} color={colors.white} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons
                  name="camera-outline"
                  size={32}
                  color={colors.textSecondary}
                />
                <Text style={styles.placeholderText}>
                  タップして{"\n"}写真を選択
                </Text>
              </View>
            )}
            <View style={[styles.overlayButton, styles.editIconOverlay]}>
              <Ionicons name="pencil" size={18} color={colors.white} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.nameEditContainer}>
          <InputField
            label=""
            value={editName}
            onChangeText={setEditName}
            placeholder="ユーザー名を入力（8文字以内）"
            style={styles.nameInput}
            textStyle={styles.nameInputText}
            maxLength={8}
            unstyled
          />
        </View>

        <View style={styles.editButtons}>
          <Button
            title="キャンセル"
            variant="secondary"
            onPress={onClose}
            style={styles.editButton}
          />
          <Button
            title="保存"
            onPress={async () => {
              await handleSaveProfile();
              onSaved?.();
              onClose();
            }}
            style={styles.saveButton}
            loading={loading}
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
    profileCard: {
      alignItems: "center",
    },
    avatarContainer: { alignItems: "center", marginBottom: spacing.xl },
    avatarEditContainer: { position: "relative" },
    avatar: { width: 120, height: 120, borderRadius: 60 },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 2,
      borderColor: colors.borderPrimary,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.backgroundSecondary,
    },
    placeholderText: {
      marginTop: 6,
      textAlign: "center",
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
    overlayButton: {
      position: "absolute",
      borderRadius: 16,
      width: 32,
      height: 32,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.white,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 6,
    },
    editIconOverlay: {
      bottom: -6,
      right: -6,
      backgroundColor: colors.info,
      shadowColor: colors.info,
    },
    removeIconOverlay: {
      top: -6,
      left: -6,
      backgroundColor: colors.error,
      shadowColor: colors.error,
    },
    nameEditContainer: { width: "100%", marginTop: 6, marginBottom: 6 },
    nameInput: {
      backgroundColor: "transparent",
      borderWidth: 0,
      paddingHorizontal: 0,
      borderBottomWidth: 2,
      borderBottomColor: colors.info,
      alignSelf: "center",
      width: "80%",
      paddingBottom: spacing.xs,
    },
    nameInputText: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.gray800,
      textAlign: "center",
    },
    editButtons: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: spacing["2xl"],
    },
    editButton: { minWidth: 100, marginHorizontal: spacing.sm },
    saveButton: {
      backgroundColor: colors.info,
      paddingHorizontal: 20,
      paddingVertical: 10,
      minWidth: 100,
      borderRadius: 22,
    },
  });
};

export default ProfileEditModal;
