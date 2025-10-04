// Minimal event bus to nudge replies UI to refresh for a post.
// Used as a local fallback when Realtime updates are delayed or unavailable.

type Unsubscribe = () => void;

const listeners = new Map<string, Set<() => void>>();

const ensure = (postId: string) => {
  let set = listeners.get(postId);
  if (!set) {
    set = new Set();
    listeners.set(postId, set);
  }
  return set;
};

export const ReplyEventBus = {
  subscribe(postId: string, cb: () => void): Unsubscribe {
    const set = ensure(postId);
    set.add(cb);
    return () => {
      set.delete(cb);
      if (set.size === 0) listeners.delete(postId);
    };
  },
  emit(postId: string) {
    const set = listeners.get(postId);
    if (!set || set.size === 0) return;
    for (const cb of Array.from(set)) {
      try {
        cb();
      } catch {}
    }
  },
};

export default ReplyEventBus;

