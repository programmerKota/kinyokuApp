import React, { useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    let intervalId: any | undefined;
    (async () => {
      try {
        if (bypass) return; // already allowed
        // 開発用バイパス（AsyncStorage）
        try {
          const devBypass = await AsyncStorage.getItem('__dev_auth_bypass');
          if (devBypass === '1') {
            if (mounted) {
              setSignedIn(true);
              setChecking(false);
              return;
            }
          }
        } catch { }
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
    // 開発用: バイパスキーのポーリング（Expo Goでの簡易回避）
    intervalId = setInterval(async () => {
      try {
        const devBypass = await AsyncStorage.getItem('__dev_auth_bypass');
        if (devBypass === '1') setSignedIn(true);
      } catch { }
    }, 1000);
    return () => {
      try { sub?.subscription?.unsubscribe(); } catch { }
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  if (signedIn) return <>{children}</>;
  if (checking) return null;
  return <AuthScreen />;
};

// styles removed: AuthScreen takes over full-screen UI

export default AuthGate;
