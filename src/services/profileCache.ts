import type { Unsubscribe } from 'firebase/firestore';
import { doc, onSnapshot } from 'firebase/firestore';

import { db } from '../config/firebase.config';

export interface UserProfileLite {
  displayName?: string;
  photoURL?: string;
}

type Listener = (profile: UserProfileLite | undefined) => void;

interface Entry {
  listeners: Set<Listener>;
  unsub?: Unsubscribe;
  data?: UserProfileLite;
  refCount: number;
  ttlTimer?: ReturnType<typeof setTimeout>;
}

/**
 * ProfileCache
 * - Multiplexes users/{uid} snapshots across the app
 * - Ref-counted subscriptions with short TTL for idle entries
 */
export class ProfileCache {
  private static instance: ProfileCache;
  private entries = new Map<string, Entry>();
  // default TTL to keep entry warm after last unsubscribe (ms)
  private readonly idleTtlMs = 60_000;

  static getInstance(): ProfileCache {
    if (!ProfileCache.instance) ProfileCache.instance = new ProfileCache();
    return ProfileCache.instance;
  }

  subscribe(userId: string, listener: Listener): Unsubscribe {
    const entry = this.ensureEntry(userId);
    entry.refCount += 1;
    entry.listeners.add(listener);

    // send current if available
    if (entry.data) listener(entry.data);

    // start snapshot if not started
    if (!entry.unsub) {
      entry.unsub = onSnapshot(doc(db, 'users', userId), (snap) => {
        const d = snap.data() as any | undefined;
        const next = d ? { displayName: d.displayName, photoURL: d.photoURL } : undefined;
        const prev = entry.data;
        // shallow equality check to avoid noisy emits
        const changed =
          !prev ||
          !next ||
          prev.displayName !== next.displayName ||
          prev.photoURL !== next.photoURL;
        if (changed) {
          entry.data = next;
          entry.listeners.forEach((l) => l(entry.data));
        }
      });
    }

    // cancel idle timer if any
    if (entry.ttlTimer) {
      clearTimeout(entry.ttlTimer);
      entry.ttlTimer = undefined;
    }

    // return unsubscribe for this listener
    return () => {
      const e = this.entries.get(userId);
      if (!e) return;
      e.listeners.delete(listener);
      e.refCount = Math.max(0, e.refCount - 1);
      if (e.refCount === 0) {
        // schedule teardown after TTL
        if (!e.ttlTimer) {
          e.ttlTimer = setTimeout(() => this.teardown(userId), this.idleTtlMs);
        }
      }
    };
  }

  subscribeMany(
    userIds: string[],
    onUpdate: (map: Map<string, UserProfileLite | undefined>) => void,
  ): Unsubscribe {
    const ids = Array.from(new Set(userIds));
    const map = new Map<string, UserProfileLite | undefined>();
    const unsubs: Unsubscribe[] = [];

    const emit = () => onUpdate(new Map(map));

    ids.forEach((id) => {
      const u = this.subscribe(id, (p) => {
        map.set(id, p);
        emit();
      });
      unsubs.push(u);
    });

    return () => unsubs.forEach((u) => u());
  }

  private ensureEntry(userId: string): Entry {
    let e = this.entries.get(userId);
    if (!e) {
      e = { listeners: new Set(), refCount: 0 } as Entry;
      this.entries.set(userId, e);
    }
    return e;
  }

  private teardown(userId: string) {
    const e = this.entries.get(userId);
    if (!e) return;
    if (e.refCount > 0) return; // in use again
    if (e.unsub) {
      try {
        e.unsub();
      } catch {}
    }
    this.entries.delete(userId);
  }
}

export default ProfileCache;
