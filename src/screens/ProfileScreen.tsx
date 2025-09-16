import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    ScrollView,
    TouchableOpacity,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import InputField from '../components/InputField';
import Modal from '../components/Modal';
import { colors, spacing, typography, shadows } from '../theme';
import { validateRequired, validateMaxLength } from '../utils/validation';

const ProfileScreen: React.FC = () => {
    const { user, updateProfile, refreshUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAvatar, setEditAvatar] = useState('');
    const [loading, setLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);

    useEffect(() => {
        if (user) {
            setEditName(user.displayName);
            setEditAvatar(user.avatarUrl || '');
        }
    }, [user]);

    const handleSaveProfile = async () => {
        const trimmedName = editName.trim();

        // 必須チェック
        const requiredValidation = validateRequired(trimmedName, 'ユーザー名');
        if (!requiredValidation.isValid) {
            Alert.alert('エラー', requiredValidation.message);
            return;
        }

        // 文字数制限チェック（8文字以下）
        const maxLengthValidation = validateMaxLength(trimmedName, 8, 'ユーザー名');
        if (!maxLengthValidation.isValid) {
            Alert.alert('エラー', maxLengthValidation.message);
            return;
        }

        setLoading(true);
        try {
            await updateProfile(trimmedName, editAvatar.trim() || undefined);
            setIsEditing(false);
            Alert.alert('成功', 'プロフィールを更新しました');
        } catch (error) {
            console.error('プロフィールの更新に失敗しました:', error);
            Alert.alert('エラー', 'プロフィールの更新に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        if (user) {
            setEditName(user.displayName);
            setEditAvatar(user.avatarUrl || '');
        }
        setIsEditing(false);
    };

    const handleStartEdit = () => {
        setIsEditing(true);
    };

    const handleImagePicker = async () => {
        try {
            // 権限をリクエスト
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert('エラー', 'アルバムへのアクセス権限が必要です');
                return;
            }

            // 画像選択オプション
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: false,
            });

            if (!result.canceled && result.assets[0]) {
                setEditAvatar(result.assets[0].uri);
            }
        } catch (error) {
            console.error('画像選択に失敗しました:', error);
            Alert.alert('エラー', '画像の選択に失敗しました');
        }
    };

    const handleRemoveImage = () => {
        setEditAvatar('');
    };

    const handleAvatarPress = async () => {
        if (isEditing) return;
        if (user?.avatarUrl) {
            setShowAvatarModal(true);
        } else {
            setIsEditing(true);
            await handleImagePicker();
        }
    };

    const handleResetProfile = () => {
        Alert.alert(
            'プロフィールリセット',
            'プロフィールをリセットしますか？この操作は元に戻せません。',
            [
                { text: 'キャンセル', style: 'cancel' },
                {
                    text: 'リセット',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // UserServiceのリセット機能を使用
                            const UserService = (await import('../services/userService')).default;
                            const userService = UserService.getInstance();
                            await userService.resetUser();
                            await refreshUser();
                            Alert.alert('成功', 'プロフィールをリセットしました');
                        } catch (error) {
                            console.error('プロフィールのリセットに失敗しました:', error);
                            Alert.alert('エラー', 'プロフィールのリセットに失敗しました');
                        }
                    },
                },
            ]
        );
    };

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

                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        {isEditing ? (
                            <TouchableOpacity onPress={handleImagePicker} style={styles.avatarEditContainer}>
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
                                        <Text style={styles.placeholderText}>タップして{"\n"}写真を選択</Text>
                                    </View>
                                )}
                                <View style={[styles.overlayButton, styles.editIconOverlay]}>
                                    <Ionicons name="pencil" size={18} color="white" />
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8}>
                                {user.avatarUrl ? (
                                    <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.defaultAvatar}>
                                        <Text style={styles.avatarText}>
                                            {user.displayName.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    {isEditing ? (
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
                            <Text style={styles.characterCount}>
                                {editName.length}/8
                            </Text>
                        </View>
                    ) : (
                        <Text style={[styles.userName, isEditing && styles.userNameEditing]}>
                            {user.displayName}
                        </Text>
                    )}

                    {isEditing ? (
                        <View style={styles.editButtons}>
                            <Button
                                title="キャンセル"
                                onPress={handleCancelEdit}
                                variant="secondary"
                                style={styles.editButton}
                            />
                            <Button
                                title="保存"
                                onPress={handleSaveProfile}
                                variant="primary"
                                style={styles.saveButton}
                                loading={loading}
                            />
                        </View>
                    ) : (
                        <View style={styles.singleActionWrapper}>
                            <Button
                                title="プロフィールを編集"
                                onPress={handleStartEdit}
                                variant="primary"
                                style={styles.primaryCTA}
                                size="large"
                            />
                        </View>
                    )}
                </View>

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
                            onPress={async () => {
                                setShowAvatarModal(false);
                                setIsEditing(true);
                                await handleImagePicker();
                            }}
                            style={styles.editButton}
                        />
                        {user?.avatarUrl ? (
                            <Button
                                title="削除"
                                onPress={() => {
                                    setShowAvatarModal(false);
                                    setIsEditing(true);
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
