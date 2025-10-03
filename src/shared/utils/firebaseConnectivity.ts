import { useEffect, useMemo, useRef, useState } from "react";

import { supabaseConfig } from "@app/config/supabase.config";
import SupabaseService from "@core/services/supabase/supabaseService";

export type ConnectivityResult = {
  ok: boolean;
  latencyMs?: number;
  errorCode?: string;
  errorMessage?: string;
  from: "firestore" | "rest";
  timestamp: number;
};

const AUTH_HEALTH_URL = () => `${supabaseConfig.url}/auth/v1/health`;

export async function pingFirestoreDoc(
  timeoutMs = 4000,
): Promise<ConnectivityResult> {
  const start = Date.now();
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Supabaseのヘルスチェックを流用
    const ok = await SupabaseService.testConnection();
    return {
      ok,
      latencyMs: Date.now() - start,
      from: "firestore",
      timestamp: Date.now(),
    };
  } catch (e) {
    const err = e as { code?: string; name?: string; message?: unknown };
    const code: string | undefined =
      err?.code || (err?.name === "AbortError" ? "timeout" : undefined);
    return {
      ok: false,
      latencyMs: Date.now() - start,
      errorCode: code,
      errorMessage: typeof err?.message === "string" ? err.message : undefined,
      from: "firestore",
      timestamp: Date.now(),
    };
  } finally {
    clearTimeout(to);
  }
}

export async function pingFirestoreRest(
  timeoutMs = 4000,
): Promise<ConnectivityResult> {
  const start = Date.now();
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (!supabaseConfig?.isConfigured) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        errorCode: "not-configured",
        from: "rest",
        timestamp: Date.now(),
      };
    }
    const res = await fetch(AUTH_HEALTH_URL(), {
      signal: controller.signal,
    });
    return {
      ok: res.ok,
      latencyMs: Date.now() - start,
      errorCode: res.ok ? undefined : String(res.status),
      errorMessage: res.ok ? undefined : res.statusText,
      from: "rest",
      timestamp: Date.now(),
    };
  } catch (e) {
    const err = e as { name?: string; message?: unknown };
    const code = err?.name === "AbortError" ? "timeout" : undefined;
    return {
      ok: false,
      latencyMs: Date.now() - start,
      errorCode: code,
      errorMessage: typeof err?.message === "string" ? err.message : undefined,
      from: "rest",
      timestamp: Date.now(),
    };
  } finally {
    clearTimeout(to);
  }
}

export function useFirebaseConnectivity(options?: { intervalMs?: number }) {
  const { intervalMs = 30000 } = options || {};
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [state, setState] = useState({
    api: undefined as ConnectivityResult | undefined,
    firestore: undefined as ConnectivityResult | undefined,
    lastCheckedAt: 0,
  });

  const checkOnce = useMemo(() => {
    return async () => {
      const [api, fs] = await Promise.allSettled([
        pingFirestoreRest(),
        pingFirestoreDoc(),
      ]);
      const apiRes =
        api.status === "fulfilled"
          ? api.value
          : ({
              ok: false,
              from: "rest",
              timestamp: Date.now(),
            } as ConnectivityResult);
      const fsRes =
        fs.status === "fulfilled"
          ? fs.value
          : ({
              ok: false,
              from: "firestore",
              timestamp: Date.now(),
            } as ConnectivityResult);
      setState({ api: apiRes, firestore: fsRes, lastCheckedAt: Date.now() });
    };
  }, []);

  useEffect(() => {
    void checkOnce();
    if (intervalMs > 0) {
      timerRef.current = setInterval(() => {
        void checkOnce();
      }, intervalMs);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [checkOnce, intervalMs]);

  const status: "online" | "degraded" | "offline" = useMemo(() => {
    const apiOk = state.api?.ok;
    const fsOk =
      state.firestore?.ok || state.firestore?.errorCode === "permission-denied";
    if (apiOk && fsOk) return "online";
    if (apiOk || fsOk) return "degraded";
    return "offline";
  }, [state.api, state.firestore]);

  return { ...state, status, refresh: checkOnce };
}
