import AsyncStorage from "@react-native-async-storage/async-storage";
import { makeRedirectUri } from "expo-auth-session";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "@app/config/supabase.config";

let initialized = false;

// Returns a redirect URL for Supabase Auth that works across:
// - Native (EAS/Dev Client): <scheme>://auth/callback
// - Expo Go: uses expo-auth-session proxy (https://auth.expo.io/...)
// - Web: https://<origin>/auth/callback
export const getRedirectTo = () => {
  try {
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      (window as unknown as { location?: { origin?: string } })?.location
        ?.origin
    ) {
      const url = `${(window as unknown as { location: { origin: string } }).location.origin}/auth/callback`;
      if (__DEV__) {
        try {
          console.log("[getRedirectTo] Mode: Web, URL:", url);
        } catch {}
      }
      return url;
    }

    // Check if running in Expo Go
    const isExpoGo =
      (Constants as unknown as { appOwnership?: string })?.appOwnership ===
      "expo";

    if (isExpoGo) {
      // In Expo Go, use expo-auth-session proxy.
      // Ensure you’ve added the resulting URL to Supabase Redirect URLs:
      //   https://auth.expo.io/@<owner>/<slug>
      // useProxy option exists at runtime; cast to any to avoid type drift across SDKs
      const url = makeRedirectUri();
      if (__DEV__) {
        try {
          console.log("[getRedirectTo] Mode: Expo Go (Proxy), URL:", url);
        } catch {}
      }
      return url;
    }

    // In EAS Dev Client or standalone build, use custom scheme
    const scheme =
      (Constants?.expoConfig as unknown as { scheme?: string })?.scheme ||
      (Constants as unknown as { manifest?: { scheme?: string } })?.manifest
        ?.scheme ||
      "abstinence";

    const url = `${scheme}://auth/callback`;
    if (__DEV__) {
      try {
        console.log(
          "[getRedirectTo] Mode: EAS Dev Client (固定URL), URL:",
          url,
        );
      } catch {}
    }
    return url;
  } catch (e) {
    // Safe fallback
    const url = Linking.createURL("auth/callback");
    if (__DEV__) {
      try {
        console.log("[getRedirectTo] Mode: Fallback, URL:", url);
      } catch {}
    }
    return url;
  }
};

export async function initSupabaseAuthDeepLinks() {
  if (initialized) return;
  initialized = true;

  const handle = async ({ url }: { url: string }) => {
    try {
      // debug
      if (__DEV__) {
        try {
          console.log("[auth] deep link url:", url);
        } catch {}
      }

      // Robustly parse both query (?a=b) and hash (#a=b) tokens
      const parsed = Linking.parse(url);
      const qp = parsed?.queryParams ?? {};
      const rawHash = (() => {
        try {
          const u = new URL(url);
          return (u.hash ?? "").replace(/^#/, "");
        } catch {
          return "";
        }
      })();
      const hp = (() => {
        try {
          return Object.fromEntries(new URLSearchParams(rawHash).entries());
        } catch {
          return {};
        }
      })() as Record<string, string>;

      // OAuth PKCE flow: code parameter
      const code = (qp?.code as string) || hp?.code || "";
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        if (__DEV__) {
          try {
            console.log("[auth] exchange via code ok");
          } catch {}
        }
        return;
      }

      // Implicit flow: access_token + refresh_token
      const access_token =
        (qp?.access_token as string) || hp?.access_token || "";
      const refresh_token =
        (qp?.refresh_token as string) || hp?.refresh_token || "";
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        if (__DEV__) {
          try {
            console.log("[auth] setSession via hash tokens ok");
          } catch {}
        }
        return;
      }

      // Magic link / Email verification: token_hash + type
      const token_hash = (qp?.token_hash as string) || hp?.token_hash || "";
      const type = ((qp?.type as string) || hp?.type || "") as
        | "recovery"
        | "signup"
        | "invite"
        | "magiclink"
        | "email_change"
        | "email";
      // Flag pending password recovery so UI can prompt even if event name differs
      if (type === "recovery") {
        try {
          await AsyncStorage.setItem("__auth_pending_recovery", "1");
        } catch {}
      }
      if (token_hash && type) {
        const email = (qp?.email as string) || hp?.email || "" || undefined;
        await supabase.auth.verifyOtp({
          type,
          token_hash,
          email,
        } as unknown as Parameters<typeof supabase.auth.verifyOtp>[0]);
        if (__DEV__) {
          try {
            console.log("[auth] verifyOtp via token_hash ok");
          } catch {}
        }
        return;
      }
    } catch (e) {
      if (__DEV__) {
        try {
          console.error("[auth] deep link handle error:", e);
        } catch {}
      }
      // noop: let caller surface auth state via UI if needed
    }
  };

  // subscribe for future openings
  Linking.addEventListener("url", handle);

  // handle cold start
  const initialUrl = await Linking.getInitialURL();
  if (initialUrl) await handle({ url: initialUrl });
}

export async function signInWithApple() {
  const redirectTo = getRedirectTo();
  return await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo },
  });
}

export async function signInWithGoogle() {
  const redirectTo = getRedirectTo();
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
}

export async function sendMagicLink(
  email: string,
  opts?: { shouldCreateUser?: boolean },
) {
  const redirectTo = getRedirectTo();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      // login用は false、signup用は true を明示
      shouldCreateUser: opts?.shouldCreateUser ?? false,
    },
  });
  if (error) throw error;
}

export async function signUpWithEmailPassword(email: string, password: string) {
  const redirectTo = getRedirectTo();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmailPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function resetPassword(email: string) {
  const redirectTo = getRedirectTo();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Unified OAuth launcher used by UI screens
export async function startOAuthFlow(
  provider: "google" | "apple" | "twitter" | "amazon" | "line",
) {
  const redirectTo = getRedirectTo();
  if (provider === "line") {
    throw new Error("PROVIDER_NOT_SUPPORTED: line");
  }
  type SupaProvider = Parameters<
    typeof supabase.auth.signInWithOAuth
  >[0]["provider"];
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as unknown as SupaProvider,
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== "web",
    },
  });
  if (error || !data?.url) {
    if (__DEV__) {
      try {
        console.error("[auth] OAuth start failed", error);
      } catch {}
    }
    throw error ?? new Error("OAUTH_START_FAILED");
  }

  if (Platform.OS === "web") {
    try {
      (window as unknown as { location: { href: string } }).location.href =
        data.url;
    } catch {}
    return;
  }

  // Native: prefer in-app auth session so user returns to app
  try {
    const returnUrl = Linking.createURL("auth/callback");
    await WebBrowser.openAuthSessionAsync(data.url, returnUrl);
  } catch (e) {
    try {
      await Linking.openURL(data.url);
    } catch {}
  }
}
