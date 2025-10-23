import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  FirestoreUserService,
  TournamentService,
} from "@core/services/firestore";
import { BlockService } from "@core/services/firestore/blockService";
import { FollowService } from "@core/services/firestore";
import { CommunityService } from "@core/services/supabase/communityService";
import { supabase } from "@app/config/supabase.config";
import UserService from "@core/services/userService";
import { uploadUserAvatar } from "@core/services/supabase/storageService";
import { PurchasesService } from "@core/services/payments/purchasesService";
import { featureFlags } from "@app/config/featureFlags.config";
import { withRetry } from "@shared/utils/net";
import type { User } from "@project-types";
import { BlockStore } from "@shared/state/blockStore";
import { FollowStore } from "@shared/state/followStore";
import { Logger } from "@shared/utils/logger";

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
      // Only migrate if new profile is missing; avoid overwriting an existing user with stale data
      const { data: newRow } = await supabase
        .from("profiles")
        .select("displayName, photoURL")
        .eq("id", supaUid)
        .maybeSingle();
      if (newRow && ((newRow as any).displayName || (newRow as any).photoURL)) {
        return; // already has data; do not migrate
      }
      const { data: oldRow } = await supabase
        .from("profiles")
        .select("displayName, photoURL")
        .eq("id", legacyId)
        .maybeSingle();
      if (!oldRow) return;
      await FirestoreUserService.setUserProfile(supaUid, {
        displayName: (oldRow as any).displayName || "User",
        photoURL: (oldRow as any).photoURL || undefined,
      });
      try {
        await supabase.from("profiles").delete().eq("id", legacyId);
      } catch (e) {
        Logger.warn("AuthContext.migrateCleanup", e);
      }
    } catch (e) {
      Logger.error("AuthContext.tryMigrateLegacyProfile", e);
    }
  };

  const loadUser = useCallback(async () => {
    try {
      const localProfile = await userService.getCurrentUser();
      let uid = localProfile.id;
      let displayName = localProfile.name;
      let avatarUrl = localProfile.avatar;
      let supaSessionUid: string | undefined;

      // Prefer Supabase auth/session identity when available
      try {
        const { data } = await supabase.auth.getSession();
        const suid = data?.session?.user?.id as string | undefined;
        if (suid) {
          uid = suid;
          supaSessionUid = suid;
          // If a different user has signed in on this device, do not carry over
          // local fallback name/avatar from the previous (device) user.
          if (localProfile.id && localProfile.id !== suid) {
            try {
              await Promise.all([
                userService.setUserName(""),
                userService.setAvatarUrl(undefined),
              ]);
            } catch {}
            displayName = "";
            avatarUrl = undefined;
          }
          // Pull latest profile from Supabase if present
          const profResult = (await withRetry(
            async () =>
              await supabase
                .from("profiles")
                .select("displayName, photoURL")
                .eq("id", uid)
                .maybeSingle(),
            { retries: 2, delayMs: 400 },
          )) as { data: any; error: any };
          const prof = profResult.data;
          if (prof) {
            displayName = (prof as any).displayName || displayName || "User";
            avatarUrl = (prof as any).photoURL || avatarUrl;
          } else {
            // No profile row yet -> use safe defaults (avoid showing previous user's avatar)
            displayName = displayName || "User";
            avatarUrl = undefined;
          }
          // If profile row is missing or effectively empty, mark for profile setup modal
          try {
            const emptyProfile =
              !prof || (!(prof as any).displayName && !(prof as any).photoURL);
            if (emptyProfile) {
              await AsyncStorage.setItem("__post_signup_profile", "1");
            }
          } catch {}
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

      // RevenueCat 登録（ベストエフォート）
      try {
        if (supaSessionUid) {
          await PurchasesService.registerUser({
            uid: supaSessionUid,
            displayName,
            // Supabaseのユーザー情報に email がある場合は反映（ないケースもある）
            email:
              (await supabase.auth.getUser()).data?.user?.email || undefined,
            platform:
              (typeof navigator !== "undefined"
                ? "web"
                : (Platform as any)?.OS) || "unknown",
          });
        }
      } catch {
        /* ignore */
      }

      // Best-effort: reflect profile to posts/comments right after login so UI updates without manual edit
      if (supaSessionUid) {
        void Promise.allSettled([
          CommunityService.reflectUserProfile(
            supaSessionUid,
            displayName,
            avatarUrl || undefined,
          ),
          TournamentService.reflectUserProfile(
            supaSessionUid,
            displayName,
            avatarUrl || undefined,
          ),
        ]);
      }
    } catch (error) {
      if (__DEV__) {
        try {
          console.error("AuthContext: load failed", error);
        } catch {}
      }
      const fallbackUser: User = {
        uid: "fallback-user",
        displayName: "User",
        avatarUrl: undefined,
        avatarVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as User;
      if (__DEV__) {
        try {
          console.log("AuthContext: fallbackUser", fallbackUser);
        } catch {}
      }
      setUser(fallbackUser);
    } finally {
      setLoading(false);
    }
  }, [userService]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  // Keep user state in sync with Supabase auth events (sign-in/out, token refresh)
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      void loadUser();
    });
    return () => {
      try {
        data?.subscription?.unsubscribe();
      } catch {}
    };
  }, [loadUser]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = BlockService.subscribeBlockedIds(user.uid, (ids) => {
      BlockStore.setFromServer(ids);
    });
    return unsub;
  }, [user?.uid]);

  // Keep following IDs in a lightweight external store to reflect on Follow tab immediately
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = FollowService.subscribeToFollowingUserIds(
      user.uid,
      (ids: string[]) => {
        FollowStore.setFromServer(ids);
      },
    );
    return unsub;
  }, [user?.uid]);

  const updateProfile = async (displayName: string, avatarUrl?: string) => {
    try {
      // Determine current Supabase user ID (required for DB write with RLS)
      const { data } = await supabase.auth.getSession();
      const suid = (data?.session?.user?.id as string | undefined) || undefined;

      // Normalize avatarUrl: upload local uri to Supabase Storage in production
      let finalAvatar: string | undefined = avatarUrl?.trim() || undefined;
      try {
        if (suid && finalAvatar && !/^https?:\/\//i.test(finalAvatar)) {
          // Only attempt upload when we have an authenticated Supabase user
          finalAvatar = await uploadUserAvatar(finalAvatar, suid);
        }
      } catch (e) {
        console.warn(
          "avatar upload failed; keeping previous http(s) avatar if any",
          e,
        );
        const prev = user?.avatarUrl;
        finalAvatar = prev && /^https?:\/\//i.test(prev) ? prev : undefined;
      }

      // Persist to local profile cache first (works offline / without Supabase)
      await userService.updateProfile(displayName, finalAvatar);

      // Best-effort: persist to Supabase when session is available
      try {
        if (suid) {
          await FirestoreUserService.setUserProfile(suid, {
            displayName,
            photoURL: finalAvatar,
          });
        } else if (!featureFlags.authDisabled) {
          // If auth is not intentionally disabled and no session, surface a soft warning
          console.warn(
            "updateProfile: no Supabase session; saved locally only",
          );
        }
      } catch (e) {
        console.warn(
          "updateProfile: remote save failed; local changes kept",
          e,
        );
      }

      // Update local AuthContext state immediately
      setUser(
        (prev) =>
          ({
            uid: suid || prev?.uid,
            displayName,
            avatarUrl: finalAvatar,
            avatarVersion: (prev?.avatarVersion || 0) + (finalAvatar ? 1 : 0),
            createdAt: prev?.createdAt || new Date(),
            updatedAt: new Date(),
          }) as User,
      );

      // Prime ProfileCache so all screens reflect immediately (do not wait for Realtime)
      try {
        const { ProfileCache } = await import("@core/services/profileCache");
        if (suid)
          ProfileCache.getInstance().prime(suid, {
            displayName,
            photoURL: finalAvatar,
          });
      } catch {}

      // RevenueCat へプロフィール属性を反映（ベストエフォート）
      try {
        if (suid) {
          await PurchasesService.registerUser({
            uid: suid,
            displayName,
            email:
              (await supabase.auth.getUser()).data?.user?.email || undefined,
            platform:
              (typeof navigator !== "undefined"
                ? "web"
                : (Platform as any)?.OS) || "unknown",
          });
        }
      } catch {
        /* ignore */
      }

      // Best-effort reflection to related tables
      if (suid) {
        void Promise.allSettled([
          CommunityService.reflectUserProfile(suid, displayName, finalAvatar),
          TournamentService.reflectUserProfile(suid, displayName, finalAvatar),
        ]);
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
