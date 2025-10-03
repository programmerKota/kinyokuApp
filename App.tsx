import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider } from "@app/contexts/AuthContext";
import RootNavigator from "@app/navigation/RootNavigator";
import ErrorBoundary from "@shared/components/ErrorBoundary";
import ConnectivityBadge from "@shared/components/ConnectivityBadge";
import { initSupabaseAuthDeepLinks } from "@core/services/supabase/authService";

const App = () => {
  useEffect(() => {
    void initSupabaseAuthDeepLinks();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ErrorBoundary>
      {__DEV__ && <ConnectivityBadge />}
    </GestureHandlerRootView>
  );
};

export default App;
