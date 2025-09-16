import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index';
import UserService from '../services/userService';
import { FirestoreUserService, CommunityService, TournamentService } from '../services/firestore';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    updateProfile: (displayName: string, avatarUrl?: string) => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const userService = UserService.getInstance();

    const loadUser = async () => {
        try {
            const userProfile = await userService.getCurrentUser();
            const now = new Date();

            const userData = {
                uid: userProfile.id,
                displayName: userProfile.name,
                avatarUrl: userProfile.avatar,
                avatarVersion: 0,
                createdAt: now,
                updatedAt: now,
            };

            console.log('AuthContext: ユーザー情報を読み込みました', { userData });
            setUser(userData);
        } catch (error) {
            console.error('ユーザー情報の読み込みに失敗しました:', error);
            // フォールバック: デフォルトユーザー
            const fallbackUser = {
                uid: 'fallback-user',
                displayName: 'ユーザー',
                avatarUrl: undefined,
                avatarVersion: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            console.log('AuthContext: フォールバックユーザーを使用', { fallbackUser });
            setUser(fallbackUser);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUser();
    }, []);

    const updateProfile = async (displayName: string, avatarUrl?: string) => {
        try {
            // 1) まずローカルを更新（UIを即時反映）
            await userService.updateProfile(displayName, avatarUrl);

            if (user) {
                setUser({
                    ...user,
                    displayName,
                    avatarUrl,
                    avatarVersion: avatarUrl ? user.avatarVersion + 1 : user.avatarVersion,
                    updatedAt: new Date(),
                });
            }

            // 2) Firestoreはベストエフォート（ローカル専用モードでは完全スキップ）
            try {
                if (process.env.EXPO_PUBLIC_DISABLE_FIRESTORE === 'true') {
                    return;
                }
                const uid = user?.uid || (await userService.getUserId());
                await FirestoreUserService.setUserProfile(uid, { displayName, photoURL: avatarUrl });
                // プロフィール更新を投稿/返信/大会の冗長フィールドへ反映（非同期）
                Promise.allSettled([
                    CommunityService.reflectUserProfile(uid, displayName, avatarUrl),
                    TournamentService.reflectUserProfile(uid, displayName, avatarUrl),
                ]).catch(() => {});
            } catch (e) {
                console.warn('Firestoreへのプロフィール反映に失敗しました（オフラインかも）:', e);
            }
        } catch (error) {
            console.error('プロフィールの更新に失敗しました:', error);
            throw error; // ここはユーザー名のローカル更新自体に失敗した場合のみエラーを伝播
        }
    };

    const refreshUser = async () => {
        setLoading(true);
        await loadUser();
    };

    const value = {
        user,
        loading,
        updateProfile,
        refreshUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
