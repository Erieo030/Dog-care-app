/** 用途：組合功能 Stack 與六個底部分頁；照片、地圖暫時為獨立入口。 */
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import AbnormalRecordTypeScreen from '../screens/AbnormalRecordTypeScreen';
import CreateHealthEventScreen from '../screens/CreateHealthEventScreen';
import CreateReminderScreen from '../screens/CreateReminderScreen';
import DailyLogScreen from '../screens/DailyLogScreen';
import HomeScreen from '../screens/HomeScreen';
import HomeThemeScreen from '../screens/HomeThemeScreen';
import AIAssistantHubScreen from '../screens/AIAssistantHubScreen';
import { AddPetScreen, EditPetScreen } from '../screens/ManagePetScreen';
import SettingsHomeScreen from '../screens/SettingsHomeScreen';
import {
  AccountInfoScreen,
  AIDataUseInfoScreen,
  AIUsageScreen,
  AboutScreen,
  NotificationSettingsScreen,
  PetManagementScreen,
  PrivacyPolicyScreen,
  TermsOfUseScreen,
} from '../features/settings/screens';
import ExportCenterScreen from '../screens/ExportCenterScreen';
import { LostPetSettingsScreen, LostPetQrScreen } from '../features/pet-identity/screens';
import ReminderListScreen from '../screens/ReminderListScreen';
import TimelineScreen from '../screens/TimelineScreen';
import { HomeStackParamList, MainTabParamList, ProfileStackParamList } from './types';
import { Colors } from '../constants/Colors';
import { BottomNavigationDock } from '../components/navigation/BottomNavigationDock';
import { renderSharedHealthScreens } from './SharedHealthScreens';
import CarePhotosScreen from '../features/care-photos/CarePhotosScreen';
import VetMapScreen from '../features/vet-map/VetMapScreen';
import {
  DOCK_HORIZONTAL_PADDING,
  TAB_ITEM_MARGIN,
} from '../components/navigation/bottomNavigationLayout';

const Tabs = createBottomTabNavigator<MainTabParamList>();

const styles = StyleSheet.create({
  tabLabel: { alignItems: 'center', justifyContent: 'center', marginTop: 0 },
  tabLabelText: { fontSize: 11, lineHeight: 16, fontWeight: '600' },
  tabLabelActive: { fontWeight: '700' },
  tabIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: TAB_ITEM_MARGIN,
    marginVertical: 5,
    borderRadius: 21,
    minHeight: 44,
  },
});
const Stack = createNativeStackNavigator<HomeStackParamList>();
const HealthStackNav = createNativeStackNavigator<HomeStackParamList>();
const TimelineStackNav = createNativeStackNavigator<HomeStackParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();
const PhotosStackNav = createNativeStackNavigator<HomeStackParamList>();
const MapStackNav = createNativeStackNavigator<HomeStackParamList>();

function PhotosStack() {
  return (
    <PhotosStackNav.Navigator id="PhotosStack" screenOptions={getIosSwipeStackOptions()}>
      <PhotosStackNav.Screen
        name="PhotosOverview"
        component={CarePhotosScreen}
        options={{ headerShown: false }}
      />
      {renderSharedHealthScreens(PhotosStackNav)}
    </PhotosStackNav.Navigator>
  );
}

function MapStack() {
  return (
    <MapStackNav.Navigator id="MapStack" screenOptions={getIosSwipeStackOptions()}>
      <MapStackNav.Screen
        name="VetMap"
        component={VetMapScreen}
        initialParams={{ entry: 'tab' }}
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </MapStackNav.Navigator>
  );
}

function resetTabStackToRoot(
  navigation: BottomTabNavigationProp<MainTabParamList>,
  tabRouteKey: string,
  rootRouteName: string,
) {
  const tabRoute = navigation.getState().routes.find((route) => route.key === tabRouteKey);
  const nestedState = tabRoute?.state;
  const nestedStackKey = nestedState?.key;
  if (!nestedStackKey) return;

  // Tapping an already-open tab root should be a no-op. Resetting even when the
  // root is active replaces its route key and remounts the screen (visible as a flash).
  const activeRoute = nestedState.routes[nestedState.index ?? 0];
  if (nestedState.routes.length === 1 && activeRoute?.name === rootRouteName) return;

  navigation.dispatch({
    ...CommonActions.reset({ index: 0, routes: [{ name: rootRouteName }] }),
    target: nestedStackKey,
  });
}

// react-native-screens 支援全螢幕返回，但目前 native-stack 型別尚未暴露此欄位。
const getIosSwipeStackOptions = () =>
  ({
    animation: 'none',
    gestureEnabled: Platform.OS === 'ios',
    fullScreenSwipeEnabled: Platform.OS === 'ios',
    gestureResponseDistance: { start: 200 },
    headerBackVisible: true,
    headerBackButtonDisplayMode: 'minimal',
    headerStyle: { backgroundColor: Colors.background },
    headerTintColor: Colors.text,
    headerTitleStyle: { color: Colors.text },
    headerShadowVisible: false,
  }) as NativeStackNavigationOptions & { fullScreenSwipeEnabled?: boolean };

function HomeStack() {
  const screenOptions = getIosSwipeStackOptions();
  return (
    <Stack.Navigator id="HomeStack" screenOptions={screenOptions}>
      <Stack.Screen
        name="HomeOverview"
        component={HomeScreen}
        options={{
          headerShown: false,
          // Home artwork itself must extend all the way behind the floating dock.
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen name="DailyLog" component={DailyLogScreen} options={{ title: '今日紀錄' }} />
      <Stack.Screen name="AddPet" component={AddPetScreen} options={{ title: '新增毛孩' }} />
      <Stack.Screen name="EditPet" component={EditPetScreen} options={{ title: '編輯毛孩資料' }} />
      <Stack.Screen
        name="ReminderList"
        component={ReminderListScreen}
        options={{ title: '提醒' }}
      />
      <Stack.Screen
        name="CreateReminder"
        component={CreateReminderScreen}
        options={{ title: '新增提醒' }}
      />
      <Stack.Screen
        name="AbnormalType"
        component={AbnormalRecordTypeScreen}
        options={{ title: '記錄異常' }}
      />
      <Stack.Screen
        name="CreateHealthEvent"
        component={CreateHealthEventScreen}
        options={{ title: '新增健康紀錄' }}
      />
      {renderSharedHealthScreens(Stack)}
    </Stack.Navigator>
  );
}

function HealthStack() {
  const screenOptions = getIosSwipeStackOptions();
  return (
    <HealthStackNav.Navigator id="HealthStack" screenOptions={screenOptions}>
      <HealthStackNav.Screen
        name="HealthOverview"
        component={AIAssistantHubScreen}
        options={{ headerShown: false }}
      />
      {renderSharedHealthScreens(HealthStackNav)}
    </HealthStackNav.Navigator>
  );
}

function TimelineStack() {
  const screenOptions = getIosSwipeStackOptions();
  return (
    <TimelineStackNav.Navigator id="TimelineStack" screenOptions={screenOptions}>
      <TimelineStackNav.Screen
        name="TimelineOverview"
        component={TimelineScreen}
        options={{ headerShown: false }}
      />
      <TimelineStackNav.Screen
        name="ReminderList"
        component={ReminderListScreen}
        options={{ title: '提醒' }}
      />
      <TimelineStackNav.Screen
        name="DailyLog"
        component={DailyLogScreen}
        options={{ title: '今日紀錄' }}
      />
      <TimelineStackNav.Screen
        name="CreateReminder"
        component={CreateReminderScreen}
        options={{ title: '新增提醒' }}
      />
      {renderSharedHealthScreens(TimelineStackNav)}
    </TimelineStackNav.Navigator>
  );
}

function ProfileStack() {
  const screenOptions = getIosSwipeStackOptions();
  return (
    <ProfileStackNav.Navigator
      id="ProfileStack"
      screenOptions={{ ...screenOptions, headerBackButtonDisplayMode: 'minimal' }}
    >
      <ProfileStackNav.Screen
        name="ProfileOverview"
        component={SettingsHomeScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="HomeTheme"
        component={HomeThemeScreen}
        options={{ title: '照護小屋風格' }}
      />
      <ProfileStackNav.Screen
        name="AIUsage"
        component={AIUsageScreen}
        options={{ title: 'AI 使用紀錄' }}
      />
      <ProfileStackNav.Screen
        name="AIDataUseInfo"
        component={AIDataUseInfoScreen}
        options={{ title: 'AI 資料使用說明' }}
      />
      <ProfileStackNav.Screen
        name="EditPet"
        component={EditPetScreen}
        options={{ title: '編輯毛孩資料' }}
      />
      <ProfileStackNav.Screen
        name="AccountInfo"
        component={AccountInfoScreen}
        options={{ title: '使用者資訊' }}
      />
      <ProfileStackNav.Screen
        name="PetManagement"
        component={PetManagementScreen}
        options={{ title: '我的毛孩' }}
      />
      <ProfileStackNav.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: '' }}
      />
      <ProfileStackNav.Screen
        name="ExportCenter"
        component={ExportCenterScreen}
        options={{ title: '匯出照護紀錄' }}
      />
      <ProfileStackNav.Screen
        name="LostPetSettings"
        component={LostPetSettingsScreen}
        options={{ title: '' }}
      />
      <ProfileStackNav.Screen
        name="LostPetQr"
        component={LostPetQrScreen}
        options={{ title: '' }}
      />
      <ProfileStackNav.Screen
        name="About"
        component={AboutScreen}
        options={{ title: '關於 MEGO' }}
      />
      <ProfileStackNav.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: '' }}
      />
      <ProfileStackNav.Screen
        name="TermsOfUse"
        component={TermsOfUseScreen}
        options={{ title: '' }}
      />
    </ProfileStackNav.Navigator>
  );
}

const icon =
  (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: string; size: number; focused: boolean }) => (
    <View style={styles.tabIcon}>
      <Ionicons name={name} color={color} size={Math.min(size, 23)} />
    </View>
  );

const tabLabel =
  (text: string) =>
  ({ focused, color }: { focused: boolean; color: string }) => (
    <View style={styles.tabLabel}>
      <Text
        numberOfLines={1}
        style={[styles.tabLabelText, focused && styles.tabLabelActive, { color }]}
      >
        {text}
      </Text>
    </View>
  );

function TabBubbleButton(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable {...props} style={[props.style, styles.tabButton]}>
      {props.children}
    </PlatformPressable>
  );
}

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const tabBarStyle = {
    height: 54 + Math.max(insets.bottom, 12),
    // Match the selected bubble's top inset to its bottom inset inside the dock.
    paddingTop: 1,
    // Keep each equal-width active bubble optically inset from both capsule ends.
    paddingHorizontal: DOCK_HORIZONTAL_PADDING,
    // 導覽項目與膠囊底部採用相同 inset，避免圖示與標籤視覺偏上。
    paddingBottom: Math.max(insets.bottom - 14, 4),
    // 所有分頁的背景都延伸至膠囊後方；堆疊內容已預留導覽列高度。
    position: 'absolute' as const,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    zIndex: 10,
  };
  return (
    <Tabs.Navigator
      id="MainTabs"
      screenOptions={() => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.subtext,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle,
        tabBarBackground: () => <BottomNavigationDock />,
      })}
    >
      <Tabs.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarStyle,
          tabBarButton: TabBubbleButton,
          tabBarIcon: icon('home-outline'),
          tabBarLabel: tabLabel('首頁'),
          tabBarAccessibilityLabel: '首頁',
        }}
        listeners={({ navigation, route }) => ({
          tabPress: () => resetTabStackToRoot(navigation, route.key, 'HomeOverview'),
        })}
      />
      <Tabs.Screen
        name="Timeline"
        component={TimelineStack}
        options={{
          tabBarButton: TabBubbleButton,
          tabBarIcon: icon('journal-outline'),
          tabBarLabel: tabLabel('紀錄'),
          tabBarAccessibilityLabel: '紀錄',
        }}
        listeners={({ navigation, route }) => ({
          tabPress: () => resetTabStackToRoot(navigation, route.key, 'TimelineOverview'),
        })}
      />
      <Tabs.Screen
        name="Photos"
        component={PhotosStack}
        options={{
          tabBarButton: TabBubbleButton,
          tabBarIcon: icon('images-outline'),
          tabBarLabel: tabLabel('照片'),
          tabBarAccessibilityLabel: '照護照片',
        }}
        listeners={({ navigation, route }) => ({
          tabPress: () => resetTabStackToRoot(navigation, route.key, 'PhotosOverview'),
        })}
      />
      <Tabs.Screen
        name="Map"
        component={MapStack}
        options={{
          tabBarButton: TabBubbleButton,
          tabBarIcon: icon('map-outline'),
          tabBarLabel: tabLabel('地圖'),
          tabBarAccessibilityLabel: '就醫地圖',
        }}
      />
      <Tabs.Screen
        name="Health"
        component={HealthStack}
        options={{
          tabBarStyle,
          tabBarButton: TabBubbleButton,
          tabBarIcon: icon('chatbubble-ellipses-outline'),
          tabBarLabel: tabLabel('MEGO AI'),
          tabBarAccessibilityLabel: 'MEGO AI',
        }}
        listeners={({ navigation, route }) => ({
          tabPress: () => resetTabStackToRoot(navigation, route.key, 'HealthOverview'),
        })}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarButton: TabBubbleButton,
          tabBarIcon: icon('settings-outline'),
          tabBarLabel: tabLabel('設定'),
          tabBarAccessibilityLabel: '設定',
        }}
        listeners={({ navigation, route }) => ({
          tabPress: () => resetTabStackToRoot(navigation, route.key, 'ProfileOverview'),
        })}
      />
    </Tabs.Navigator>
  );
}
