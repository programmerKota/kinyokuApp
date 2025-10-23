import { useSyncExternalStore } from "react";

const subs = new Set<() => void>();
let blocked = new Set<string>();

export const BlockStore = {
  get(): Set<string> {
    return blocked;
  },
  setFromServer(ids: string[]) {
    const next = new Set(ids);
    // Avoid needless emits
    if (sameSet(blocked, next)) return;
    blocked = next;
    emit();
  },
  add(id: string) {
    if (blocked.has(id)) return;
    blocked = new Set(blocked);
    blocked.add(id);
    emit();
  },
  remove(id: string) {
    if (!blocked.has(id)) return;
    blocked = new Set(blocked);
    blocked.delete(id);
    emit();
  },
  subscribe(listener: () => void) {
    subs.add(listener);
    return () => subs.delete(listener);
  },
};

const emit = () => subs.forEach((l) => l());

const sameSet = (a: Set<string>, b: Set<string>) => {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
};

export const useBlockedIds = (): Set<string> => {
  const subscribe = (cb: () => void) => BlockStore.subscribe(cb);
  const getSnapshot = () => BlockStore.get();
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};
