/** 用途：切換登入導航樹，並在登入、回前景及通知點擊時同步 Local Notification。 */
import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, AppState, StyleSheet, useColorScheme, View } from 'react-native';
import {
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';

import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  reconcileAccountNotifications,
  subscribeToNotificationResponses,
} from '../services/notificationService';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import PetSetupStack from './PetSetupStack';
import { MainTabParamList } from './types';

const navigationRef = createNavigationContainerRef<MainTabParamList>();

export default function RootNavigator() {
  const { session, isLoading } = useAuth();
  const { pets, isLoading: isLoadingPets, selectPet } = usePet();
  const { settings, loading: isLoadingSettings } = useSettings();
  const systemScheme = useColorScheme();
  const dark =
    settings.theme === 'dark' || (settings.theme === 'system' && systemScheme === 'dark');
  const navigationTheme = dark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: '#E9C46A',
          card: '#241F1B',
          background: '#191613',
          text: '#F4EDE4',
          border: '#3D352F',
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: '#C98742',
          card: '#FFFFFF',
          background: '#FCFAF1',
          text: '#6A4D3E',
          border: '#E8E0D4',
        },
      };

  const reconcile = useCallback(() => {
    if (!session?.userId || !pets.length) return;
    reconcileAccountNotifications(session.userId, pets).catch(() => undefined);
  }, [session?.userId, pets]);

  useEffect(() => {
    reconcile();
  }, [reconcile]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') reconcile();
    });
    return () => subscription.remove();
  }, [reconcile]);
  useEffect(
    () =>
      subscribeToNotificationResponses((target) => {
        if (!session || target.userId !== session.userId || !navigationRef.isReady()) return;
        if (pets.some((pet) => pet.id === target.petId)) selectPet(target.petId);
        navigationRef.navigate('Home', {
          screen: 'ReminderList',
          params: { focusReminderId: target.reminderId },
        });
      }),
    [session, pets, selectPet],
  );

  if (isLoading || isLoadingPets || isLoadingSettings) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      {!session ? <AuthStack /> : pets.length ? <MainTabs /> : <PetSetupStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
