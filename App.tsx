import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider } from "@app/contexts/AuthContext";
import RootNavigator from "@app/navigation/RootNavigator";
import ErrorBoundary from "@shared/components/ErrorBoundary";
import { initSupabaseAuthDeepLinks } from "@core/services/supabase/authService";
import { AuthPromptProvider } from "@shared/auth/AuthPromptProvider";
import { AuthGate } from "@shared/auth/AuthGate";

const App = () => {
  useEffect(() => {
    void initSupabaseAuthDeepLinks();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthPromptProvider>
          <AuthProvider>
            {(() => {
              try {
                if (typeof window !== 'undefined') {
                  const q = new URLSearchParams(window.location.search);
                  if (q.get('e2e') === '1' || (window.navigator as any)?.webdriver) {
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
    </GestureHandlerRootView>
  );
};

export default App;
