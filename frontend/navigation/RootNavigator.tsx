/** 用途：切換登入導航樹，並在登入、回前景及通知點擊時同步 Local Notification。 */
import React, { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  createNavigationContainerRef,
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

const MINIMUM_SPLASH_DURATION_MS = 2000;
const splashStartedAt = Date.now();

// Keep the splash static until ready, then switch cleanly to the mounted route tree.
SplashScreen.setOptions({ duration: 0, fade: false });
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const navigationRef = createNavigationContainerRef<MainTabParamList>();

export default function RootNavigator() {
  const { session, isLoading } = useAuth();
  const { pets, isLoading: isLoadingPets, selectPet } = usePet();
  const { loading: isLoadingSettings } = useSettings();
  const isAppLoading = isLoading || isLoadingPets || isLoadingSettings;
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#C98742',
      // Keep navigator surfaces transparent so each tab's own background continues
      // behind the floating dock instead of painting a separate bottom strip.
      card: 'transparent',
      background: Colors.background,
      text: '#6A4D3E',
      border: '#E8E0D4',
    },
  };

  const reconcile = useCallback(() => {
    if (!session?.userId || !pets.length) return;
    reconcileAccountNotifications(session.userId, pets).catch(() => undefined);
  }, [session?.userId, pets]);
  const handleNavigationReady = useCallback(() => {
    // Keep the native splash visible until the authenticated route tree is mounted.
    // Also enforce a 2-second minimum so the MEGO mark is actually visible at launch.
    const remaining = Math.max(
      0,
      MINIMUM_SPLASH_DURATION_MS - (Date.now() - splashStartedAt),
    );
    setTimeout(() => {
      SplashScreen.hideAsync().catch(() => undefined);
    }, remaining);
  }, []);

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

  if (isAppLoading) return null;

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={handleNavigationReady}
    >
      {!session ? <AuthStack /> : pets.length ? <MainTabs /> : <PetSetupStack />}
    </NavigationContainer>
  );
}
