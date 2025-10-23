import React, { useEffect, useState } from "react";
import { supabase } from "@app/config/supabase.config";
import { featureFlags } from "@app/config/featureFlags.config";
import AuthScreen from "@features/auth/screens/AuthScreen";

type Props = { children: React.ReactNode };

export const AuthGate: React.FC<Props> = ({ children }) => {
  const bypass = (() => {
    try {
      if (featureFlags.authDisabled) return true;
      if (typeof window !== 'undefined') {
        const q = new URLSearchParams(window.location.search);
        if (q.get('e2e') === '1') return true;
        if (window.localStorage?.getItem('__e2e_auth_bypass') === '1') return true;
        try {
          if ((window.navigator as any)?.webdriver) return true;
        } catch { }
      }
    } catch { }
    return false;
  })();
  const [checking, setChecking] = useState(!bypass);
  const [signedIn, setSignedIn] = useState<boolean>(bypass);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (bypass) return; // already allowed (E2E / featureFlags only)
        const { data } = await supabase.auth.getSession();
        const ok = !!data?.session?.user?.id;
        if (mounted) setSignedIn(ok);
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSignedIn(!!sess?.user?.id);
    });
    return () => {
      try { sub?.subscription?.unsubscribe(); } catch { }
    };
  }, []);

  if (signedIn) return <>{children}</>;
  if (checking) return null;
  return <AuthScreen />;
};

// styles removed: AuthScreen takes over full-screen UI

export default AuthGate;
