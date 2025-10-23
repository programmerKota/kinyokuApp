import { useMemo } from 'react';

import { useProfile } from '@shared/hooks/useProfile';

/**
 * useDisplayProfile
 * - Unifies how we derive display name and avatar across screens.
 * - Prefers live ProfileCache values; falls back to provided snapshot values.
 * - Returns memoized results to avoid unnecessary re-renders.
 */
export const useDisplayProfile = (
  userId?: string,
  fallbackName?: string,
  fallbackAvatar?: string,
) => {
  const live = useProfile(userId);
  return useMemo(() => {
    const rawName = (live?.displayName ?? fallbackName ?? 'ユーザー');
    const nameTrimmed = (typeof rawName === 'string' ? rawName.trim() : 'ユーザー');
    const name = nameTrimmed.length > 0 ? nameTrimmed : 'ユーザー';
    const avatar = live?.photoURL ?? (fallbackAvatar && fallbackAvatar.trim() ? fallbackAvatar : undefined);
    return { name, avatar } as const;
  }, [live?.displayName, live?.photoURL, fallbackName, fallbackAvatar]);
};

export default useDisplayProfile;
