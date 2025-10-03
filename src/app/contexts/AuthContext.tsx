import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import {
  FirestoreUserService,
  TournamentService,
} from "@core/services/firestore";
import { BlockService } from "@core/services/firestore/blockService";
import { CommunityService } from "@core/services/supabase/communityService";
import { supabase } from "@app/config/supabase.config";
import UserService from "@core/services/userService";
import { uploadUserAvatar } from "@core/services/supabase/storageService";
import { withRetry } from "@shared/utils/net";
import type { User } from "@project-types";
import { BlockStore } from "@shared/state/blockStore";

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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const userService = UserService.getInstance();

  const tryMigrateLegacyProfile = async (
    supaUid: string,
    legacyId: string,
  ): Promise<void> => {
    try {
      if (!supaUid || !legacyId || supaUid === legacyId) return;
      const { data: oldRow } = await supabase
        .from("profiles")
        .select("displayName, photoURL")
        .eq("id", legacyId)
        .maybeSingle();
      if (!oldRow) return;
      const { data: newRow } = await supabase
        .from("profiles")
        .select("displayName, photoURL")
        .eq("id", supaUid)
        .maybeSingle();
      const displayName =
        (newRow as any)?.displayName || (oldRow as any).displayName || "User";
      const photoURL =
        (newRow as any)?.photoURL || (oldRow as any).photoURL || undefined;
      await FirestoreUserService.setUserProfile(supaUid, {
        displayName,
        photoURL,
      });
      try {
        await supabase.from("profiles").delete().eq("id", legacyId);
      } catch {}
    } catch {}
  };

  const loadUser = useCallback(async () => {
    try {
      const localProfile = await userService.getCurrentUser();
      let uid = localProfile.id;
      let displayName = localProfile.name;
      let avatarUrl = localProfile.avatar;

      // Prefer Supabase auth/session identity when available
      try {
        const { data } = await supabase.auth.getSession();
        const suid = data?.session?.user?.id as string | undefined;
        if (suid) {
          uid = suid;
          // Pull latest profile from Supabase if present
          const { data: prof } = await withRetry(
            () =>
              supabase
                .from("profiles")
                .select("displayName, photoURL")
                .eq("id", uid)
                .maybeSingle(),
            { retries: 2, delayMs: 400 },
          );
          if (prof) {
            displayName = (prof as any).displayName || displayName || "User";
            avatarUrl = (prof as any).photoURL || avatarUrl;
          }
          await tryMigrateLegacyProfile(uid, localProfile.id);
        }
      } catch {
        // ignore and use local profile
      }

      const now = new Date();
      const userData: User = {
        uid,
        displayName: displayName || "User",
        avatarUrl: avatarUrl || undefined,
        avatarVersion: 0,
        createdAt: now,
        updatedAt: now,
      } as unknown as User;
      setUser(userData);
    } catch (error) {
      console.error("AuthContext: load failed", error);
      const fallbackUser: User = {
        uid: "fallback-user",
        displayName: "User",
        avatarUrl: undefined,
        avatarVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as User;
      console.log("AuthContext: fallbackUser", fallbackUser);
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
      // Normalize avatarUrl: upload local uri to Supabase Storage in production
      let finalAvatar: string | undefined = avatarUrl?.trim() || undefined;
      try {
        if (finalAvatar && !/^https?:\/\//i.test(finalAvatar)) {
          // Prefer Supabase uid if available
          const { data } = await supabase.auth.getSession();
          const suid = (data?.session?.user?.id as string | undefined) || user?.uid || (await userService.getUserId());
          finalAvatar = await uploadUserAvatar(finalAvatar, suid);
        }
      } catch (e) {
        console.warn("avatar upload failed; keeping previous http(s) avatar if any", e);
        // Keep previous http(s) avatar to avoid resetting to default
        const prev = user?.avatarUrl;
        finalAvatar = prev && /^https?:\/\//i.test(prev) ? prev : undefined;
      }

      await userService.updateProfile(displayName, finalAvatar);
      try {
        // Keep AuthContext uid in sync with Supabase uid when available
        const { data } = await supabase.auth.getSession();
        const suid = (data?.session?.user?.id as string | undefined) || user?.uid || (await userService.getUserId());
        setUser((prev) => ({
          uid: suid,
          displayName,
          avatarUrl: finalAvatar,
          avatarVersion: (prev?.avatarVersion || 0) + (finalAvatar ? 1 : 0),
          createdAt: prev?.createdAt || new Date(),
          updatedAt: new Date(),
        } as User));
      } catch {
        setUser((prev) => ({
          ...(prev as User),
          displayName,
          avatarUrl: finalAvatar,
          avatarVersion: (prev?.avatarVersion || 0) + (finalAvatar ? 1 : 0),
          updatedAt: new Date(),
        } as User));
      }
      try {
        const { data } = await supabase.auth.getSession();
        const uid = (data?.session?.user?.id as string | undefined) || user?.uid || (await userService.getUserId());
        await FirestoreUserService.setUserProfile(uid, {
          displayName,
          photoURL: finalAvatar,
        });
        void Promise.allSettled([
          CommunityService.reflectUserProfile(uid, displayName, finalAvatar),
          TournamentService.reflectUserProfile(uid, displayName, finalAvatar),
        ]);
      } catch (e) {
        console.warn("Firestore reflect failed", e);
      }
    } catch (error) {
      console.error("AuthContext: updateProfile failed", error);
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
