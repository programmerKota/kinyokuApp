import * as Linking from "expo-linking";
import { makeRedirectUri } from "expo-auth-session";
import { Platform } from "react-native";
import Constants from "expo-constants";

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
      (window as any)?.location?.origin
    ) {
      const url = `${(window as any).location.origin}/auth/callback`;
      try {
        console.log("[getRedirectTo] Mode: Web, URL:", url);
      } catch {}
      return url;
    }

    // Check if running in Expo Go
    const isExpoGo = (Constants as any)?.appOwnership === "expo";

    if (isExpoGo) {
      // In Expo Go, use expo-auth-session proxy.
      // Ensure you’ve added the resulting URL to Supabase Redirect URLs:
      //   https://auth.expo.io/@<owner>/<slug>
      const url = makeRedirectUri({ useProxy: true });
      try {
        console.log("[getRedirectTo] Mode: Expo Go (Proxy), URL:", url);
      } catch {}
      return url;
    }

    // In EAS Dev Client or standalone build, use custom scheme
    const scheme =
      (Constants?.expoConfig as any)?.scheme ||
      (Constants as any)?.manifest?.scheme ||
      "abstinence";

    const url = `${scheme}://auth/callback`;
    try {
      console.log("[getRedirectTo] Mode: EAS Dev Client (固定URL), URL:", url);
    } catch {}
    return url;
  } catch (e) {
    // Safe fallback
    const url = Linking.createURL("auth/callback");
    try {
      console.log("[getRedirectTo] Mode: Fallback, URL:", url);
    } catch {}
    return url;
  }
};

export async function initSupabaseAuthDeepLinks() {
  if (initialized) return;
  initialized = true;

  const handle = async ({ url }: { url: string }) => {
    try {
      // debug
      try {
        console.log("[auth] deep link url:", url);
      } catch {}

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
      const code = (qp?.code as string) || (hp?.code as string) || "";
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        try {
          console.log("[auth] exchange via code ok");
        } catch {}
        return;
      }

      // Implicit flow: access_token + refresh_token
      const access_token =
        (qp?.access_token as string) || (hp?.access_token as string) || "";
      const refresh_token =
        (qp?.refresh_token as string) || (hp?.refresh_token as string) || "";
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        try {
          console.log("[auth] setSession via hash tokens ok");
        } catch {}
        return;
      }

      // Magic link / Email verification: token_hash + type
      const token_hash =
        (qp?.token_hash as string) || (hp?.token_hash as string) || "";
      const type = ((qp?.type as string) || (hp?.type as string) || "") as any;
      if (token_hash && type) {
        const email =
          (qp?.email as string) || (hp?.email as string) || "" || undefined;
        await supabase.auth.verifyOtp({ type, token_hash, email } as any);
        try {
          console.log("[auth] verifyOtp via token_hash ok");
        } catch {}
        return;
      }
    } catch (e) {
      try {
        console.error("[auth] deep link handle error:", e);
      } catch {}
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

export async function sendMagicLink(email: string) {
  const redirectTo = getRedirectTo();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
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
