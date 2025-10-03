import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider } from "@app/contexts/AuthContext";
import RootNavigator from "@app/navigation/RootNavigator";
import ErrorBoundary from "@shared/components/ErrorBoundary";
import ConnectivityBadge from "@shared/components/ConnectivityBadge";
import { initSupabaseAuthDeepLinks } from "@core/services/supabase/authService";
import { AuthPromptProvider } from "@shared/auth/AuthPromptProvider";

const App = () => {
  useEffect(() => {
    void initSupabaseAuthDeepLinks();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthPromptProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </AuthPromptProvider>
      </ErrorBoundary>
      {__DEV__ && <ConnectivityBadge />}
    </GestureHandlerRootView>
  );
};

export default App;
