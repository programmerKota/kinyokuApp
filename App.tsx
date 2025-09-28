import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '@app/contexts/AuthContext';
import RootNavigator from '@app/navigation/RootNavigator';
import ErrorBoundary from '@shared/components/ErrorBoundary';

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
};

export default App;
