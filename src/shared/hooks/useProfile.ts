import { useEffect, useState } from "react";

import type { UserProfileLite } from "@core/services/profileCache";
import ProfileCache from "@core/services/profileCache";

export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<UserProfileLite | undefined>(() => {
    // 初回レンダリング時に既存のキャッシュがあれば即座に取得
    if (!userId) return undefined;
    const cache = ProfileCache.getInstance();
    const entry = (cache as any).entries?.get(userId);
    return entry?.data;
  });

  useEffect(() => {
    if (!userId) {
      setProfile(undefined);
      return;
    }
    const unsub = ProfileCache.getInstance().subscribe(userId, (p) =>
      setProfile(p),
    );
    return () => {
      if (unsub) unsub();
    };
  }, [userId]);

  return profile;
};

export default useProfile;
