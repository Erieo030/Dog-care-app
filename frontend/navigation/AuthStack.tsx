/** 用途：管理登入與註冊頁面的堆疊導航。 */
import React from 'react';
import { Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  const { login, register } = useAuth();

  const submit = async (action: typeof login, email: string, password: string) => {
    try {
      await action(email, password);
    } catch (error) {
      Alert.alert('操作失敗', (error as Error).message);
    }
  };

  return (
    <Stack.Navigator id="AuthStack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onLoginSuccess={(email, password) => submit(login, email, password)}
            onGoToRegister={() => navigation.navigate('Register')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {({ navigation }) => (
          <RegisterScreen
            onRegisterSuccess={(email, password) => submit(register, email, password)}
            onGoToLogin={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
