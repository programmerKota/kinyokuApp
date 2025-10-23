import { useSyncExternalStore } from "react";

type Listener = () => void;

const subscribers = new Set<Listener>();
let following = new Set<string>();

const emit = () => subscribers.forEach((l) => l());

const sameSet = (a: Set<string>, b: Set<string>) => {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
};

export const FollowStore = {
  get(): Set<string> {
    return following;
  },
  setFromServer(ids: string[]) {
    const next = new Set(ids);
    if (sameSet(following, next)) return;
    following = next;
    emit();
  },
  add(id: string) {
    if (following.has(id)) return;
    following = new Set(following);
    following.add(id);
    emit();
  },
  remove(id: string) {
    if (!following.has(id)) return;
    following = new Set(following);
    following.delete(id);
    emit();
  },
  subscribe(listener: Listener) {
    subscribers.add(listener);
    return () => subscribers.delete(listener);
  },
};

export const useFollowingIds = (): Set<string> => {
  const subscribe = (cb: Listener) => FollowStore.subscribe(cb);
  const getSnapshot = () => FollowStore.get();
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};
