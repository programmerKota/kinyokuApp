import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { FirestoreUserService, CommunityService, TournamentService } from '@core/services/firestore';
import { BlockService } from '@core/services/firestore/blockService';
import { BlockStore } from '@shared/state/blockStore';
import UserService from '@core/services/userService';
import type { User } from '@project-types';

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

  const loadUser = useCallback(async () => {
    try {
      const userProfile = await userService.getCurrentUser();
      const now = new Date();
      const userData: User = {
        uid: userProfile.id,
        displayName: userProfile.name,
        avatarUrl: userProfile.avatar,
        avatarVersion: 0,
        createdAt: now,
        updatedAt: now,
      } as unknown as User;
      console.log('AuthContext: loaded', { userData });
      setUser(userData);
    } catch (error) {
      console.error('AuthContext: load failed', error);
      const fallbackUser: User = {
        uid: 'fallback-user',
        displayName: 'User',
        avatarUrl: undefined,
        avatarVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as User;
      console.log('AuthContext: fallbackUser', fallbackUser);
      setUser(fallbackUser);
    } finally {
      setLoading(false);
    }
  }, [userService]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = BlockService.subscribeBlockedIds(user.uid, (ids) => {
      BlockStore.setFromServer(ids);
    });
    return unsub;
  }, [user?.uid]);

  const updateProfile = async (displayName: string, avatarUrl?: string) => {
    try {
      await userService.updateProfile(displayName, avatarUrl);
      if (user) {
        setUser({
          ...user,
          displayName,
          avatarUrl,
          avatarVersion: avatarUrl ? user.avatarVersion + 1 : user.avatarVersion,
          updatedAt: new Date(),
        } as User);
      }
      try {
        if (process.env.EXPO_PUBLIC_DISABLE_FIRESTORE !== 'true') {
          const uid = user?.uid || (await userService.getUserId());
          await FirestoreUserService.setUserProfile(uid, { displayName, photoURL: avatarUrl });
          void Promise.allSettled([
            CommunityService.reflectUserProfile(uid, displayName, avatarUrl),
            TournamentService.reflectUserProfile(uid, displayName, avatarUrl),
          ]);
        }
      } catch (e) {
        console.warn('Firestore reflect failed', e);
      }
    } catch (error) {
      console.error('AuthContext: updateProfile failed', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    await loadUser();
  };

  const value: AuthContextType = {
    user,
    loading,
    updateProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

