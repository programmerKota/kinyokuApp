import * as Linking from "expo-linking";

import { supabase } from "@app/config/supabase.config";

let initialized = false;

export const getRedirectTo = () => Linking.createURL("auth/callback"); // uses app.json `scheme`

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
