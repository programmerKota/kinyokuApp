import { useSyncExternalStore } from 'react';

const vis = new Map<string, boolean>();
const subs = new Map<string, Set<() => void>>();

const ensure = (id: string) => {
  let s = subs.get(id);
  if (!s) {
    s = new Set();
    subs.set(id, s);
  }
  return s;
};

export const ReplyVisibilityStore = {
  get(id: string): boolean {
    return !!vis.get(id);
  },
  set(id: string, value: boolean) {
    vis.set(id, !!value);
    const s = subs.get(id);
    if (s) s.forEach((fn) => fn());
  },
  toggle(id: string) {
    ReplyVisibilityStore.set(id, !ReplyVisibilityStore.get(id));
  },
};

export const useReplyVisibility = (id: string, initial = false) => {
  if (!vis.has(id)) vis.set(id, initial);
  const subscribe = (cb: () => void) => {
    const s = ensure(id);
    s.add(cb);
    return () => s.delete(cb);
  };
  const get = () => ReplyVisibilityStore.get(id);
  return useSyncExternalStore(subscribe, get, get);
};

