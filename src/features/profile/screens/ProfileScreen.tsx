import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@app/config/supabase.config";
import { useAuth } from "@app/contexts/AuthContext";
import type { RootStackParamList } from "@app/navigation/RootNavigator";
import useProfileScreen from "@features/profile/hooks/useProfileScreen";
import Button from "@shared/components/Button";
import ConfirmDialog from "@shared/components/ConfirmDialog";
import InputField from "@shared/components/InputField";
import Modal from "@shared/components/Modal";
import {
  spacing,
  typography,
  shadows,
  useAppTheme,
  useThemedStyles,
} from "@shared/theme";
import AppStatusBar from "@shared/theme/AppStatusBar";
import { colorSchemes, type ColorPalette } from "@shared/theme/colors";
import { createScreenThemes } from "@shared/theme/screenThemes";
// 購入の復元機能は削除

type Styles = ReturnType<typeof createStyles>;

const ActionCard = ({
  icon,
  title,
  description,
  onPress,
  styles,
  colors,
  iconColor,
  showDivider = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  onPress: () => void | Promise<void>;
  styles: Styles;
  colors: ColorPalette;
  iconColor?: string;
  showDivider?: boolean;
}) => (
  <>
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.actionCard}
      onPress={() => {
        void onPress();
      }}
    >
      <View style={styles.actionIconWrap}>
        <Ionicons 
          name={icon} 
          size={20} 
          color={iconColor || colors.info} 
        />
      </View>
      <View style={styles.actionTextWrap}>
        <Text style={styles.actionTitle}>{title}</Text>
        {description ? (
          <Text style={styles.actionDesc}>{description}</Text>
        ) : null}
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={18} 
        color={colors.textTertiary} 
      />
    </TouchableOpacity>
    {showDivider && <View style={styles.actionDivider} />}
  </>
);

const Section = ({
  title,
  children,
  styles,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  styles: Styles;
  colors: ColorPalette;
}) => (
  <View style={styles.sectionContainer}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionCard}>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  </View>
);

const ProfileScreen: React.FC = () => {
  const { user } = useAuth();
  const [state, actions] = useProfileScreen();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { isEditing, editName, editAvatar, loading, showAvatarModal } = state;
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const { isDark, toggle, mode } = useAppTheme();
  const colors = useMemo(
    () => colorSchemes[mode] ?? colorSchemes.light,
    [mode],
  );
  const styles = useThemedStyles(createStyles);
  const {
    setShowAvatarModal,
    handleStartEdit,
    handleCancelEdit,
    handleSaveProfile,
    handleAvatarPress,
    handleImagePicker,
    handleRemoveImage,
    setEditName,
  } = actions;

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <AppStatusBar />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBar />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {isEditing ? (
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity
                onPress={() => {
                  void handleImagePicker();
                }}
                style={styles.avatarEditContainer}
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
              <Text style={styles.characterCount}>{editName.length}/8</Text>
            </View>

            <View style={styles.editButtons}>
              <Button
                title="キャンセル"
                onPress={handleCancelEdit}
                variant="secondary"
                style={styles.editButton}
              />
              <Button
                title="保存"
                onPress={() => {
                  void handleSaveProfile();
                }}
                variant="primary"
                style={styles.saveButton}
                loading={loading}
              />
            </View>
          </View>
        ) : (
          <View style={styles.settingsContainer}>
            <Section title="アカウント" styles={styles} colors={colors}>
              <ActionCard
                icon="person-outline"
                title="プロフィールを編集"
                description="名前や画像を変更できます"
                onPress={handleStartEdit}
                styles={styles}
                colors={colors}
                iconColor={colors.info}
                showDivider={true}
              />
              <ActionCard
                icon="log-out-outline"
                title="ログアウト"
                description="サインアウトしてログイン画面に戻ります"
                onPress={() => {
                  setShowLogoutConfirm(true);
                }}
                styles={styles}
                colors={colors}
                iconColor={colors.error}
                showDivider={false}
              />
            </Section>
            <Section title="表示設定" styles={styles} colors={colors}>
              <View style={styles.themeRow}>
                <View style={styles.themeIconWrap}>
                  <Ionicons 
                    name={isDark ? "moon" : "sunny-outline"} 
                    size={20} 
                    color={colors.info} 
                  />
                </View>
                <View style={styles.themeTextWrap}>
                  <Text style={styles.themeTitle}>ダークモード</Text>
                  <Text style={styles.themeDesc}>
                    アプリ全体のテーマを切り替えます
                  </Text>
                </View>
                <Switch 
                  value={isDark} 
                  onValueChange={toggle}
                  trackColor={{ 
                    false: colors.gray300, 
                    true: colors.info + "80" 
                  }}
                  thumbColor={isDark ? colors.info : colors.white}
                  ios_backgroundColor={colors.gray300}
                />
              </View>
            </Section>
            <Section title="プライバシー" styles={styles} colors={colors}>
              <ActionCard
                icon="shield-checkmark-outline"
                title="ブロック中のユーザー"
                description="ブロックしたユーザーの一覧を表示"
                onPress={() => {
                  void navigation.navigate("BlockedUsers");
                }}
                styles={styles}
                colors={colors}
                iconColor={colors.warning}
                showDivider={false}
              />
            </Section>
            <Section title="サポート" styles={styles} colors={colors}>
              <ActionCard
                icon="chatbubble-ellipses-outline"
                title="開発者へフィードバック"
                description="不具合報告・改善提案を送信"
                onPress={() => {
                  void navigation.navigate("Feedback");
                }}
                styles={styles}
                colors={colors}
                iconColor={colors.secondary}
                showDivider={false}
              />
            </Section>
          </View>
        )}
      </ScrollView>

      {/* アバタープレビュー */}
      <Modal
        visible={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        title="プロフィール画像"
      >
        <View style={{ alignItems: "center" }}>
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.avatarPreview}
            />
          ) : null}
          <View style={styles.editButtons}>
            <Button
              title="変更する"
              onPress={() => {
                void (async () => {
                  setShowAvatarModal(false);
                  handleStartEdit();
                  await handleImagePicker();
                })();
              }}
              style={styles.editButton}
            />
            {user?.avatarUrl ? (
              <Button
                title="削除"
                onPress={() => {
                  setShowAvatarModal(false);
                  handleStartEdit();
                  handleRemoveImage();
                }}
                variant="danger"
                style={styles.editButton}
              />
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ログアウト確認モーダル（Figmaスタイル） */}
      <ConfirmDialog
        visible={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="ログアウトしますか？"
        description="アカウントからサインアウトします。よろしいですか？"
        icon="log-out-outline"
        tone="danger"
        secondaryLabel="キャンセル"
        primaryLabel="ログアウト"
        onSecondary={() => setShowLogoutConfirm(false)}
        onPrimary={async () => {
          try {
            await supabase.auth.signOut();
          } catch {}
        }}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: ColorPalette) => {
  const screenThemes = createScreenThemes(colors);
  const isLightMode = colors.backgroundPrimary === "#FFFFFF";
  const subtleBorder = isLightMode
    ? colors.borderPrimary
    : "rgba(255,255,255,0.12)";

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundTertiary,
    },
    scrollView: {
      flex: 1,
    },
    settingsContainer: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing["2xl"],
      paddingBottom: spacing["4xl"],
      gap: spacing["2xl"],
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      fontSize: typography.fontSize.base,
      color: colors.textSecondary,
    },
    profileCard: {
      backgroundColor: screenThemes.profile.cardBg,
      marginHorizontal: spacing.xl,
      marginTop: spacing.xl,
      marginBottom: spacing.xl,
      borderRadius: 20,
      padding: spacing["2xl"],
      paddingTop: 40,
      paddingBottom: 28,
      alignItems: "center",
      minHeight: 320,
      borderWidth: 1,
      borderColor: subtleBorder,
      ...shadows.lg,
      shadowColor: isLightMode ? colors.shadowDark : colors.black,
      shadowOpacity: isLightMode ? 0.1 : 0.35,
    },
    sectionContainer: {
      marginBottom: 0,
    },
    sectionHeader: {
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    sectionTitle: {
      fontSize: typography.fontSize.xs,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: colors.textSecondary,
      textTransform: "uppercase",
    },
    sectionCard: {
      backgroundColor: screenThemes.profile.cardBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: subtleBorder,
      overflow: "hidden",
      ...shadows.sm,
      shadowColor: isLightMode ? colors.shadowMedium : colors.black,
      shadowOpacity: isLightMode ? 0.06 : 0.25,
    },
    sectionBody: {
      gap: 1,
      paddingVertical: spacing.xs,
    },
    actionCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "transparent",
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      minHeight: 64,
    },
    actionIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: screenThemes.profile.tintSoft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    },
    actionTextWrap: {
      flex: 1,
      justifyContent: "center",
    },
    actionTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 2,
    },
    actionDesc: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    actionDivider: {
      height: 1,
      backgroundColor: subtleBorder,
      marginHorizontal: spacing.lg,
    },
    avatarContainer: {
      marginTop: 8,
      marginBottom: 9,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 3,
      borderColor: colors.borderPrimary,
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 3,
      borderStyle: "dashed",
      borderColor: colors.info,
      backgroundColor: screenThemes.profile.tintSoft,
      justifyContent: "center",
      alignItems: "center",
    },
    placeholderText: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: "center",
      marginTop: spacing.sm,
      lineHeight: 16,
    },
    defaultAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.info,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: 32,
      fontWeight: "bold",
      color: colors.white,
    },
    avatarPreview: {
      width: 240,
      height: 240,
      borderRadius: 120,
      marginBottom: spacing.lg,
    },
    userName: {
      fontSize: 22,
      fontWeight: "bold",
      color: colors.gray800,
      marginTop: spacing.sm,
      marginBottom: 9,
    },
    userNameEditing: {
      textDecorationLine: "underline",
      textDecorationColor: colors.info,
      textDecorationStyle: "solid",
    },
    editButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.gray100,
      borderRadius: 20,
      marginHorizontal: spacing.md,
    },
    editButtonText: {
      marginLeft: 4,
      fontSize: typography.fontSize.sm,
      fontWeight: "600",
      color: colors.info,
    },
    editButtons: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: spacing["2xl"],
    },
    singleActionWrapper: {
      width: "100%",
      alignItems: "center",
      marginTop: 18,
      marginBottom: 0,
    },
    primaryCTA: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      minWidth: 220,
      borderRadius: 24,
      backgroundColor: colors.info,
      shadowColor: colors.info,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 6,
    },
    avatarEditContainer: {
      position: "relative",
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
    nameEditContainer: {
      width: "100%",
      marginTop: 6,
      marginBottom: 6,
    },
    nameInput: {
      backgroundColor: "transparent",
      borderWidth: 0,
      paddingHorizontal: 0,
      borderBottomWidth: 2,
      borderBottomColor: colors.info,
      alignSelf: "center",
      width: "70%",
      paddingBottom: spacing.xs,
    },
    nameInputText: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.gray800,
      textAlign: "center",
    },
    characterCount: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      textAlign: "center",
    },
    saveButton: {
      backgroundColor: colors.info,
      paddingHorizontal: 20,
      paddingVertical: 10,
      minWidth: 100,
      borderRadius: 22,
    },
    actionButtons: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 12,
      gap: 12,
    },
    actionButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      minWidth: 90,
    },
    themeRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      minHeight: 64,
    },
    themeIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: screenThemes.profile.tintSoft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    },
    themeTextWrap: {
      flex: 1,
      justifyContent: "center",
    },
    themeTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 2,
    },
    themeDesc: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
};

export default ProfileScreen;
