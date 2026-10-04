/** 用途：組合全域 Provider 與 RootNavigator，保持根元件單純。 */
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { AuthProvider } from './contexts/AuthContext';
import { PetProvider } from './contexts/PetContext';
import { SettingsProvider } from './contexts/SettingsContext';
import RootNavigator from './navigation/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <SettingsProvider>
            <AuthProvider>
              <PetProvider>
                <RootNavigator />
              </PetProvider>
            </AuthProvider>
          </SettingsProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
