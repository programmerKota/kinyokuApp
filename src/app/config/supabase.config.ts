import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Robust env accessor: prefer EXPO_PUBLIC_* from process.env, then from app.json extra.
type EnvLike = { [key: string]: string | undefined };
const ENV: EnvLike =
  typeof process !== "undefined" &&
  (process as unknown as { env?: EnvLike }).env
    ? ((process as unknown as { env?: EnvLike }).env as EnvLike)
    : ({} as EnvLike);

const sanitize = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  if (!s || s === "undefined" || s === "null") return undefined;
  if (/^\$\{[^}]+\}$/.test(s)) return undefined; // placeholder like ${VAR}
  return s;
};

const getEnv = (key: string): string | undefined => {
  // 1) from process.env (EXPO_PUBLIC_* is bundled by Metro)
  const fromProc = sanitize(ENV[key]);
  if (fromProc) return fromProc;
  // 2) from expo constants (dev/prod)
  try {
    const extra1 = (Constants?.expoConfig as any)?.extra as
      | Record<string, unknown>
      | undefined;
    const fromExtra1 = sanitize(extra1?.[key]);
    if (fromExtra1) return fromExtra1;
  } catch {}
  try {
    const extra2 = (Constants as any)?.manifestExtra as
      | Record<string, unknown>
      | undefined;
    const fromExtra2 = sanitize(extra2?.[key]);
    if (fromExtra2) return fromExtra2;
  } catch {}
  return undefined;
};

// Supabase configuration
let supabaseUrl = getEnv("EXPO_PUBLIC_SUPABASE_URL");
let supabaseAnonKey = getEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");

// Note: .env/.app.jsonのみを参照するため、ローカル上書きは廃止

// In development, avoid hard crash when env is missing; use placeholders and warn
let isConfigured = true;
if (!supabaseUrl || !supabaseAnonKey || !/^https?:\/\//i.test(supabaseUrl)) {
  isConfigured = false;
  console.warn(
    "[supabase.config] ENV not set. Using placeholder endpoint. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
  supabaseUrl = "https://demo-project.supabase.co";
  supabaseAnonKey = "demo-anon-key";
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic token refresh
    autoRefreshToken: true,
    // Persist session in AsyncStorage
    persistSession: true,
    storage: AsyncStorage,
    // Detect session from URL (for OAuth flows)
    // WebではtrueにしてOAuthリダイレクトを処理する    detectSessionInUrl: typeof window !== "undefined",
  },
  realtime: {
    // Enable realtime subscriptions
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Export configuration for debugging
export const supabaseConfig = {
  url: supabaseUrl,
  anonKey:
    typeof supabaseAnonKey === "string"
      ? supabaseAnonKey.substring(0, 20) + "..."
      : "",
  isConfigured,
};

if (__DEV__) {
  // Helpful startup log for troubleshooting env resolution
  // Only logs masked anon key
  // eslint-disable-next-line no-console
  console.log(
    "[supabase.config] url=",
    supabaseConfig.url,
    "isConfigured=",
    supabaseConfig.isConfigured,
    "anonKey(prefix)=",
    supabaseConfig.anonKey,
  );
}

export default supabase;

// Expose for E2E/browser automation when running on Web (no effect in native)
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__supabase = supabase;
} catch {}
