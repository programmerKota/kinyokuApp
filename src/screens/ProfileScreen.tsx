import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';

import useProfileScreen from '../hooks/useProfileScreen';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import Button from '../components/Button';
import InputField from '../components/InputField';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, typography, shadows } from '../theme';
import { openFeedbackEmail } from '../utils/feedback';

const ActionCard = ({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  onPress: () => void | Promise<void>;
}) => (
  <TouchableOpacity
    activeOpacity={0.85}
    style={styles.actionCard}
    onPress={() => {
      void onPress();
    }}
  >
    <View style={styles.actionIconWrap}>
      <Ionicons name={icon} size={22} color={colors.info} />
    </View>
    <View style={styles.actionTextWrap}>
      <Text style={styles.actionTitle}>{title}</Text>
      {description ? <Text style={styles.actionDesc}>{description}</Text> : null}
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
  </TouchableOpacity>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const ProfileScreen: React.FC = () => {
  const { user } = useAuth();
  const [state, actions] = useProfileScreen();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { isEditing, editName, editAvatar, loading, showAvatarModal } = state;
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
        <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
                      <Ionicons name="close" size={18} color="white" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                    <Text style={styles.placeholderText}>タップして{'\n'}写真を選択</Text>
                  </View>
                )}
                <View style={[styles.overlayButton, styles.editIconOverlay]}>
                  <Ionicons name="pencil" size={18} color="white" />
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
            <View style={styles.actionGrid}>
              <Section title="アカウント">
                <ActionCard
                  icon="pencil"
                  title="プロフィールを編集"
                  description="名前や画像を変更できます"
                  onPress={handleStartEdit}
                />
              </Section>
              <Section title="プライバシー">
                <ActionCard
                  icon="hand-left-outline"
                  title="ブロック中のユーザー"
                  description="ブロックしたユーザーの一覧を表示"
                  onPress={() => {
                    void navigation.navigate('BlockedUsers');
                  }}
                />
              </Section>
              <Section title="サポート">
                <ActionCard
                  icon="mail-outline"
                  title="開発者へフィードバック"
                  description="不具合報告・改善提案を送信"
                  onPress={() => {
                    void navigation.navigate('Feedback');
                  }}
                />

                <ActionCard
                  icon="shield-outline"
                  title="AV女優名管理"
                  description="不適切な投稿を防ぐためのAV女優名を管理"
                  onPress={() => {
                    void navigation.navigate('AvActressManagement');
                  }}
                />
              </Section>
            </View>
          </View>
        )}
      </ScrollView>

      {/* アバタープレビュー */}
      <Modal
        visible={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        title="プロフィール画像"
      >
        <View style={{ alignItems: 'center' }}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarPreview} />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  scrollView: {
    flex: 1,
  },
  settingsContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  profileCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    borderRadius: 20,
    padding: spacing['2xl'],
    paddingTop: 40,
    paddingBottom: 28,
    alignItems: 'center',
    minHeight: 320,
    ...shadows.lg,
  },
  actionGrid: {
    width: '100%',
    marginTop: 18,
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.md,
    marginBottom: 6,
  },
  sectionBody: {
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.base,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray800,
  },
  actionDesc: {
    marginTop: 2,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
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
    borderStyle: 'dashed',
    borderColor: colors.info,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  defaultAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.info,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    color: colors.gray800,
    marginTop: spacing.sm,
    marginBottom: 9,
  },
  userNameEditing: {
    textDecorationLine: 'underline',
    textDecorationColor: colors.info,
    textDecorationStyle: 'solid',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: 20,
    marginHorizontal: spacing.md,
  },
  editButtonText: {
    marginLeft: 4,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.info,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing['2xl'],
  },
  singleActionWrapper: {
    width: '100%',
    alignItems: 'center',
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
    position: 'relative',
  },
  overlayButton: {
    position: 'absolute',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: '100%',
    marginTop: 6,
    marginBottom: 6,
  },
  nameInput: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    borderBottomWidth: 2,
    borderBottomColor: colors.info,
    alignSelf: 'center',
    width: '70%',
    paddingBottom: spacing.xs,
  },
  nameInputText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gray800,
    textAlign: 'center',
  },
  characterCount: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.info,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 100,
    borderRadius: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 90,
  },
});

export default ProfileScreen;
