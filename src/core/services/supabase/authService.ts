import * as Linking from "expo-linking";
import { Platform } from "react-native";
import Constants from "expo-constants";

import { supabase } from "@app/config/supabase.config";

let initialized = false;

// Returns a redirect URL for Supabase Auth that works across:
// - Native (EAS/Dev Client): <scheme>://auth/callback
// - Expo Go: exp://.../--/auth/callback (Linking.createURL)
// - Web: https://<origin>/auth/callback
export const getRedirectTo = () => {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined" && (window as any)?.location?.origin) {
      return `${(window as any).location.origin}/auth/callback`;
    }
    // On native, prefer explicit app scheme so tapping email link opens the app
    const scheme = (Constants?.expoConfig as any)?.scheme
      || (Constants as any)?.manifest?.scheme
      || "abstinence"; // fallback; replace if you change app.json scheme

    // In Expo Go, createURL is correct (exp://...)
    const isExpoGo = (Constants as any)?.appOwnership === 'expo';
    if (isExpoGo) return Linking.createURL("auth/callback");

    return `${scheme}://auth/callback`;
  } catch {
    // Safe fallback
    return Linking.createURL("auth/callback");
  }
};

export async function initSupabaseAuthDeepLinks() {
  if (initialized) return;
  initialized = true;

  const handle = async ({ url }: { url: string }) => {
    try {
      const { queryParams } = Linking.parse(url);
      const code = (queryParams?.code as string) || "";
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        return;
      }

      const access_token = (queryParams?.access_token as string) || "";
      const refresh_token = (queryParams?.refresh_token as string) || "";
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        return;
      }
    } catch (e) {
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

export async function signUpWithEmailPassword(
  email: string,
  password: string,
) {
  const redirectTo = getRedirectTo();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
) {
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
