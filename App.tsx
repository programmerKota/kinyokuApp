import React from 'react';

import { AuthProvider } from '@app/contexts/AuthContext';
import RootNavigator from '@app/navigation/RootNavigator';
import ErrorBoundary from '@shared/components/ErrorBoundary';

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
