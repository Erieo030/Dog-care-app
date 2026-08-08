/** 用途：組合全域 Provider 與 RootNavigator，保持根元件單純。 */
import React from 'react';

import { AuthProvider } from './contexts/AuthContext';
import { PetProvider } from './contexts/PetContext';
import { SettingsProvider } from './contexts/SettingsContext';
import RootNavigator from './navigation/RootNavigator';

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <PetProvider>
          <RootNavigator />
        </PetProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
