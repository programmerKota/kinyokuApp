import { useSyncExternalStore } from 'react';

export type LikeState = { isLiked: boolean; likes: number; locked?: boolean };

const store = new Map<string, LikeState>();
const subs = new Map<string, Set<() => void>>();

const ensureSet = (postId: string) => {
  if (!subs.has(postId)) subs.set(postId, new Set());
  return subs.get(postId)!;
};

export const LikeStore = {
  init(postId: string, initial: LikeState) {
    if (!store.has(postId)) store.set(postId, { ...initial });
  },
  get(postId: string): LikeState | undefined {
    return store.get(postId);
  },
  set(postId: string, next: LikeState) {
    store.set(postId, next);
    const s = subs.get(postId);
    if (s) s.forEach((fn) => fn());
  },
  setFromServer(postId: string, next: LikeState) {
    const cur = store.get(postId);
    if (!cur || !cur.locked) {
      store.set(postId, { ...next, locked: cur?.locked });
      const s = subs.get(postId);
      if (s) s.forEach((fn) => fn());
    }
  },
  touch(postId: string) {
    const cur = store.get(postId) ?? { isLiked: false, likes: 0 };
    store.set(postId, { ...cur, locked: true });
  },
  update(postId: string, updater: (prev: LikeState | undefined) => LikeState) {
    const next = updater(store.get(postId));
    LikeStore.set(postId, next);
  },
};

export const useLikeState = (postId: string, initial: LikeState) => {
  // Ensure initial state is registered
  LikeStore.init(postId, initial);
  const subscribe = (cb: () => void) => {
    const set = ensureSet(postId);
    set.add(cb);
    return () => set.delete(cb);
  };
  const getSnapshot = () => LikeStore.get(postId) ?? initial;
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

