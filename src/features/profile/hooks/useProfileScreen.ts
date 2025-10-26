import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { useAuth } from "@app/contexts/AuthContext";
import { useAuthPrompt } from "@shared/auth/AuthPromptProvider";
import { validateMaxLength, validateRequired } from "@shared/utils/validation";

export interface UseProfileState {
  isEditing: boolean;
  editName: string;
  editAvatar: string;
  loading: boolean;
  showAvatarModal: boolean;
}

export interface UseProfileActions {
  setShowAvatarModal: (v: boolean) => void;
  setEditName: (v: string) => void;
  setEditAvatar: (v: string) => void;
  handleStartEdit: () => void;
  handleCancelEdit: () => void;
  handleSaveProfile: () => Promise<void>;
  handleAvatarPress: () => Promise<void>;
  handleImagePicker: () => Promise<void>;
  handleRemoveImage: () => void;
}

export const useProfileScreen = (): [UseProfileState, UseProfileActions] => {
  const { user, updateProfile } = useAuth();
  const { requireAuth } = useAuthPrompt();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.displayName);
      setEditAvatar(user.avatarUrl || "");
    }
  }, [user]);

  const handleSaveProfile = useCallback(async () => {
    const ok = await requireAuth();
    if (!ok) return;
    const trimmedName = editName.trim();
    const requiredValidation = validateRequired(trimmedName, "ユーザー名");
    if (!requiredValidation.isValid) {
      Alert.alert("エラー", requiredValidation.message);
      return;
    }
    const maxLengthValidation = validateMaxLength(trimmedName, 8, "ユーザー名");
    if (!maxLengthValidation.isValid) {
      Alert.alert("エラー", maxLengthValidation.message);
      return;
    }
    setLoading(true);
    try {
      await updateProfile(trimmedName, editAvatar.trim() || undefined);
      setIsEditing(false);
      Alert.alert("成功", "プロフィールを更新しました");
    } catch (error) {
      console.error("プロフィールの更新に失敗しました:", error);
      Alert.alert("エラー", "プロフィールの更新に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [editName, editAvatar, updateProfile, requireAuth]);

  const handleCancelEdit = useCallback(() => {
    if (user) {
      setEditName(user.displayName);
      setEditAvatar(user.avatarUrl || "");
    }
    setIsEditing(false);
  }, [user]);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleImagePicker = useCallback(async () => {
    const ok = await requireAuth();
    if (!ok) return;
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("エラー", "アルバムへのアクセス権限が必要です");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Always convert to JPEG to avoid HEIC/WEBP decode issues on some platforms
        try {
          // eslint-disable-next-line import/no-unresolved
          const manip = await import("expo-image-manipulator");
          const { manipulateAsync, SaveFormat } = manip;
          const out = await manipulateAsync(asset.uri, [], {
            compress: 0.9,
            format: SaveFormat.JPEG,
            base64: true,
          });
          if (out?.base64) {
            setEditAvatar(`data:image/jpeg;base64,${out.base64}`);
            return;
          }
        } catch {}
        // Fallback: trust base64 if provided; default to jpeg
        if (asset.base64) {
          setEditAvatar(`data:image/jpeg;base64,${asset.base64}`);
          return;
        }
        setEditAvatar(asset.uri);
      }
    } catch (error) {
      console.error("画像選択に失敗しました:", error);
      Alert.alert("エラー", "画像の選択に失敗しました");
    }
  }, [requireAuth]);

  const handleRemoveImage = useCallback(() => {
    setEditAvatar("");
  }, []);

  const handleAvatarPress = useCallback(async () => {
    if (isEditing) return;
    if (user?.avatarUrl) {
      setShowAvatarModal(true);
    } else {
      setIsEditing(true);
      await handleImagePicker();
    }
  }, [isEditing, user?.avatarUrl, handleImagePicker]);

  const state: UseProfileState = useMemo(
    () => ({ isEditing, editName, editAvatar, loading, showAvatarModal }),
    [isEditing, editName, editAvatar, loading, showAvatarModal],
  );

  const actions: UseProfileActions = {
    setShowAvatarModal,
    setEditName,
    setEditAvatar,
    handleStartEdit,
    handleCancelEdit,
    handleSaveProfile,
    handleAvatarPress,
    handleImagePicker,
    handleRemoveImage,
  };

  return [state, actions];
};

export default useProfileScreen;
