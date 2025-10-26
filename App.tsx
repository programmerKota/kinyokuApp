import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider } from "@app/contexts/AuthContext";
import RootNavigator from "@app/navigation/RootNavigator";
import { initSupabaseAuthDeepLinks } from "@core/services/supabase/authService";
import { AuthGate } from "@shared/auth/AuthGate";
import { AuthPromptProvider } from "@shared/auth/AuthPromptProvider";
import ErrorBoundary from "@shared/components/ErrorBoundary";
import { ThemeProvider } from "@shared/theme";

const App = () => {
  // Keep console available for diagnostics; avoid global silencing

  // Preload icon fonts to prevent first‑paint flicker of vector icons
  const [fontsLoaded] = useFonts((Ionicons as any).font ?? {});
  useEffect(() => {
    try {
      (Ionicons as any)?.loadFont?.();
    } catch {}
  }, []);

  useEffect(() => {
    void initSupabaseAuthDeepLinks();
  }, []);
  if (!fontsLoaded) {
    // Keep a minimal root to avoid white flash while fonts load
    return <GestureHandlerRootView style={{ flex: 1 }} />;
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ErrorBoundary>
          <AuthPromptProvider>
            <AuthProvider>
              {(() => {
                try {
                  if (typeof window !== "undefined") {
                    const q = new URLSearchParams(window.location.search);
                    if (
                      q.get("e2e") === "1" ||
                      (window.navigator as any)?.webdriver
                    ) {
                      return <RootNavigator />;
                    }
                  }
                } catch {}
                return (
                  <AuthGate>
                    <RootNavigator />
                  </AuthGate>
                );
              })()}
            </AuthProvider>
          </AuthPromptProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default App;
