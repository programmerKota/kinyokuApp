import React from 'react';

import { AuthProvider } from '@app/contexts/AuthContext';
import RootNavigator from '@app/navigation/RootNavigator';

const App = () => {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
};

export default App;
