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
      if (!code) return;
      await supabase.auth.exchangeCodeForSession(code);
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

export async function signOut() {
  await supabase.auth.signOut();
}
