type Unsubscribe = () => void;
import { supabase, supabaseConfig } from "@app/config/supabase.config";

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
      // initial fetch
      (async () => {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("displayName, photoURL")
            .eq("id", userId)
            .maybeSingle();
          const next = data
            ? {
                displayName: (data as any).displayName ?? undefined,
                photoURL: (data as any).photoURL ?? undefined,
              }
            : undefined;
          entry.data = next;
          entry.listeners.forEach((l) => l(entry.data));
        } catch {
          // ignore
        }
      })();

      // realtime subscription
      let channel: ReturnType<typeof supabase.channel> | undefined;
      if (supabaseConfig?.isConfigured) {
        channel = supabase
          .channel(`realtime:profiles:${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "profiles",
              filter: `id=eq.${userId}`,
            },
            (payload) => {
              const row = (payload.new || payload.old) as
                | { displayName?: string; photoURL?: string }
                | undefined;
              if (!row) return;
              const next = {
                displayName: row.displayName ?? entry.data?.displayName,
                photoURL: row.photoURL ?? entry.data?.photoURL,
              } as UserProfileLite;
              const prev = entry.data;
              if (
                !prev ||
                prev.displayName !== next.displayName ||
                prev.photoURL !== next.photoURL
              ) {
                entry.data = next;
                entry.listeners.forEach((l) => l(entry.data));
              }
            },
          )
          .subscribe();
      }
      entry.unsub = () => {
        try {
          if (channel) channel.unsubscribe();
        } catch {}
      };
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
      } catch {
        // noop
      }
    }
    this.entries.delete(userId);
  }
}

export default ProfileCache;
