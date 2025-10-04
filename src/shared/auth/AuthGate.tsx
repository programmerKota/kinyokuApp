import React, { useEffect, useState } from "react";
import { supabase } from "@app/config/supabase.config";
import AuthScreen from "@features/auth/screens/AuthScreen";

type Props = { children: React.ReactNode };

export const AuthGate: React.FC<Props> = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
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
      try { sub?.subscription?.unsubscribe(); } catch {}
    };
  }, []);

  if (signedIn) return <>{children}</>;
  if (checking) return null;
  return <AuthScreen />;
};

// styles removed: AuthScreen takes over full-screen UI

export default AuthGate;
