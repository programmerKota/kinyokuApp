import { useEffect, useState } from 'react';

import type { UserProfileLite } from '../services/profileCache';
import ProfileCache from '../services/profileCache';

export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<UserProfileLite | undefined>();

  useEffect(() => {
    if (!userId) return;
    const unsub = ProfileCache.getInstance().subscribe(userId, (p) => setProfile(p));
    return () => {
      if (unsub) unsub();
    };
  }, [userId]);

  return profile;
};

export default useProfile;
