import { useSyncExternalStore } from "react";

const counts = new Map<string, number>();
const subs = new Map<string, Set<() => void>>();

const ensure = (postId: string) => {
  let s = subs.get(postId);
  if (!s) {
    s = new Set();
    subs.set(postId, s);
  }
  return s;
};

export const ReplyCountStore = {
  init(postId: string, initial: number) {
    if (!counts.has(postId)) counts.set(postId, initial || 0);
  },
  get(postId: string): number {
    return counts.get(postId) ?? 0;
  },
  set(postId: string, value: number) {
    counts.set(postId, Math.max(0, value || 0));
    const s = subs.get(postId);
    if (s) s.forEach((fn) => fn());
  },
  // For values coming from server snapshots. Avoid lowering the
  // current value to mitigate eventual consistency (e.g., when the
  // UI already incremented optimistically but the server has not
  // reflected the change yet). Exact reconciliation is done by
  // RepliesList when it loads the actual list.
  setFromServer(postId: string, value: number) {
    const next = Math.max(0, value || 0);
    // Server snapshot is authoritative; always set.
    ReplyCountStore.set(postId, next);
  },
  increment(postId: string, delta: number) {
    const v = (counts.get(postId) ?? 0) + delta;
    ReplyCountStore.set(postId, v);
  },
};

export const useReplyCount = (postId: string, initial: number) => {
  ReplyCountStore.init(postId, initial);
  const subscribe = (cb: () => void) => {
    const s = ensure(postId);
    s.add(cb);
    return () => s.delete(cb);
  };
  const get = () => ReplyCountStore.get(postId);
  return useSyncExternalStore(subscribe, get, get);
};
