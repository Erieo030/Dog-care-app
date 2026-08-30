/** 用途：組合全部功能 Stack 與四個主要底部分頁。 */
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import AbnormalRecordTypeScreen from '../screens/AbnormalRecordTypeScreen';
import CreateHealthEventScreen from '../screens/CreateHealthEventScreen';
import CreateReminderScreen from '../screens/CreateReminderScreen';
import DailyLogScreen from '../screens/DailyLogScreen';
import VomitingHealthEventScreen from '../screens/VomitingHealthEventScreen';
import StoolHealthEventScreen from '../screens/StoolHealthEventScreen';
import ObservationHealthEventScreen from '../screens/ObservationHealthEventScreen';
import HealthEventDetailScreen from '../screens/HealthEventDetailScreen';
import HealthEventEditScreen from '../screens/HealthEventEditScreen';
import HealthEventListScreen from '../screens/HealthEventListScreen';
import HomeScreen from '../screens/HomeScreen';
import AIChatScreen from '../screens/AIChatScreen';
import AIAssistantHubScreen from '../screens/AIAssistantHubScreen';
import PreVetSummaryScreen from '../screens/PreVetSummaryScreen';
import GlobalSearchScreen from '../screens/GlobalSearchScreen';
import { AddPetScreen, EditPetScreen } from '../screens/ManagePetScreen';
import MedicalVisitDetailScreen from '../screens/MedicalVisitDetailScreen';
import MedicalVisitFormScreen from '../screens/MedicalVisitFormScreen';
import MedicalVisitListScreen from '../screens/MedicalVisitListScreen';
import SettingsHomeScreen, { AccountInfoScreen, AIUsageScreen } from '../screens/SettingsHomeScreen';
import {
  AboutScreen,
  NotificationSettingsScreen,
  PetManagementScreen,
  PrivacyPolicyScreen,
  TermsOfUseScreen,
} from '../screens/SettingsScreens';
import ExportCenterScreen from '../screens/ExportCenterScreen';
import { LostPetSettingsScreen, LostPetQrScreen } from '../screens/LostPetScreens';
import ReminderListScreen from '../screens/ReminderListScreen';
import TimelineScreen from '../screens/TimelineScreen';
import WeightFormScreen from '../screens/WeightFormScreen';
import WeightListScreen from '../screens/WeightListScreen';
import {
  VaccinationListScreen,
  VaccinationFormScreen,
  VaccinationDetailScreen,
} from '../screens/VaccinationScreens';
import {
  DewormingListScreen,
  DewormingFormScreen,
  DewormingDetailScreen,
} from '../screens/DewormingScreens';
import {
  MedicationListScreen,
  MedicationFormScreen,
  MedicationDetailScreen,
} from '../screens/MedicationScreens';
import { HomeStackParamList, MainTabParamList, ProfileStackParamList } from './types';
import { Colors } from '../constants/Colors';
import { BottomNavigationDock } from '../components/navigation/BottomNavigationDock';

const Tabs = createBottomTabNavigator<MainTabParamList>();

const styles = StyleSheet.create({
  tabLabel: { alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  tabLabelText: { fontSize: 13, fontWeight: '600' },
  tabLabelActive: { fontWeight: '700' },
  activeIndicator: { width: 22, height: 3, borderRadius: 2, marginTop: 3, backgroundColor: Colors.primary },
});
const Stack = createNativeStackNavigator<HomeStackParamList>();
const HealthStackNav = createNativeStackNavigator<HomeStackParamList>();
const TimelineStackNav = createNativeStackNavigator<HomeStackParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();

// react-native-screens 支援全螢幕返回，但目前 native-stack 型別尚未暴露此欄位。
const iosSwipeStackOptions = {
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
  contentStyle: { backgroundColor: Colors.background },
} as NativeStackNavigationOptions & { fullScreenSwipeEnabled?: boolean };

const healthEventScreens = (Screen: typeof Stack) => (
  <>
    <Screen.Screen
      name="HealthEventList"
      component={HealthEventListScreen}
      options={{ title: '健康異常紀錄' }}
    />
    <Screen.Screen
      name="HealthEventDetail"
      component={HealthEventDetailScreen}
      options={{ title: '健康紀錄詳細內容' }}
    />
    <Screen.Screen
      name="HealthEventEdit"
      component={HealthEventEditScreen}
      options={{ title: '編輯健康紀錄' }}
    />

    <Screen.Screen
      name="VomitingHealthEvent"
      component={VomitingHealthEventScreen}
      options={{ title: '嘔吐快速紀錄' }}
    />
    <Screen.Screen
      name="StoolHealthEvent"
      component={StoolHealthEventScreen}
      options={{ title: '排便異常快速紀錄' }}
    />
    <Screen.Screen
      name="ObservationHealthEvent"
      component={ObservationHealthEventScreen}
      options={{ title: '健康異常快速紀錄' }}
    />
  </>
);

const sharedHealthScreens = (Screen: typeof Stack) => (
  <>
    {healthEventScreens(Screen)}
    <Screen.Screen name="WeightList" component={WeightListScreen} options={{ title: '體重紀錄' }} />
    <Screen.Screen
      name="VaccinationList"
      component={VaccinationListScreen}
      options={{ title: '' }}
    />
    <Screen.Screen
      name="VaccinationForm"
      component={VaccinationFormScreen}
      options={{ title: '新增／編輯疫苗' }}
    />
    <Screen.Screen
      name="VaccinationDetail"
      component={VaccinationDetailScreen}
      options={{ title: '疫苗詳細內容' }}
    />
    <Screen.Screen
      name="DewormingList"
      component={DewormingListScreen}
      options={{ title: '' }}
    />
    <Screen.Screen
      name="DewormingForm"
      component={DewormingFormScreen}
      options={{ title: '新增／編輯驅蟲' }}
    />
    <Screen.Screen
      name="DewormingDetail"
      component={DewormingDetailScreen}
      options={{ title: '驅蟲詳細內容' }}
    />
    <Screen.Screen
      name="MedicationList"
      component={MedicationListScreen}
      options={{ title: '' }}
    />
    <Screen.Screen
      name="MedicationForm"
      component={MedicationFormScreen}
      options={{ title: '新增／編輯用藥' }}
    />
    <Screen.Screen
      name="MedicationDetail"
      component={MedicationDetailScreen}
      options={{ title: '用藥詳細內容' }}
    />
    <Screen.Screen name="WeightForm" component={WeightFormScreen} options={{ title: '更新體重' }} />
    <Screen.Screen
      name="MedicalVisitList"
      component={MedicalVisitListScreen}
      options={{ title: '' }}
    />
    <Screen.Screen
      name="MedicalVisitForm"
      component={MedicalVisitFormScreen}
      options={{ title: '新增／編輯就醫紀錄' }}
    />
    <Screen.Screen
      name="MedicalVisitDetail"
      component={MedicalVisitDetailScreen}
      options={{ title: '就醫紀錄詳細內容' }}
    />
  </>
);

function HomeStack() {
  return (
    <Stack.Navigator id="HomeStack" screenOptions={iosSwipeStackOptions}
    >
      <Stack.Screen name="HomeOverview" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AIChat" component={AIChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="VetVisitBrief" component={PreVetSummaryScreen} options={{ title: '就醫前摘要' }} />
      <Stack.Screen name="DailyLog" component={DailyLogScreen} options={{ title: '今日紀錄' }} />
      <Stack.Screen
        name="GlobalSearch"
        component={GlobalSearchScreen}
        options={{ title: '搜尋與篩選' }}
      />
      <Stack.Screen name="AddPet" component={AddPetScreen} options={{ title: '新增毛孩' }} />
      <Stack.Screen name="EditPet" component={EditPetScreen} options={{ title: '編輯毛孩資料' }} />
      <Stack.Screen name="ReminderList" component={ReminderListScreen} options={{ title: '提醒' }} />
      <Stack.Screen name="CreateReminder" component={CreateReminderScreen} options={{ title: '新增提醒' }} />
      <Stack.Screen name="AbnormalType" component={AbnormalRecordTypeScreen} options={{ title: '記錄異常' }} />
      <Stack.Screen name="CreateHealthEvent" component={CreateHealthEventScreen} options={{ title: '新增健康紀錄' }} />
      {sharedHealthScreens(Stack)}
    </Stack.Navigator>
  );
}

function HealthStack() {
  return (
    <HealthStackNav.Navigator id="HealthStack" screenOptions={iosSwipeStackOptions}
    >
      <HealthStackNav.Screen name="HealthOverview" component={AIAssistantHubScreen} options={{ headerShown: false }} />
      <HealthStackNav.Screen name="AIChat" component={AIChatScreen} options={{ headerShown: false }} />
      <HealthStackNav.Screen name="VetVisitBrief" component={PreVetSummaryScreen} options={{ title: '就醫前摘要' }} />
      {sharedHealthScreens(HealthStackNav)}
    </HealthStackNav.Navigator>
  );
}

function TimelineStack() {
  return (
    <TimelineStackNav.Navigator id="TimelineStack" screenOptions={iosSwipeStackOptions}
    >
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
      {sharedHealthScreens(TimelineStackNav)}
    </TimelineStackNav.Navigator>
  );
}

function ProfileStack() {
  return (
    <ProfileStackNav.Navigator
      id="ProfileStack"
      screenOptions={{ ...iosSwipeStackOptions, headerBackButtonDisplayMode: 'minimal' }}
    >
      <ProfileStackNav.Screen
        name="ProfileOverview"
        component={SettingsHomeScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="AIUsage"
        component={AIUsageScreen}
        options={{ title: 'AI 助手額度' }}
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
        options={{ title: '照護提醒' }}
      />
      <ProfileStackNav.Screen
        name="ExportCenter"
        component={ExportCenterScreen}
        options={{ title: '匯出照護紀錄' }}
      />
      <ProfileStackNav.Screen
        name="LostPetSettings"
        component={LostPetSettingsScreen}
        options={{ title: '毛孩身份 QR' }}
      />
      <ProfileStackNav.Screen
        name="LostPetQr"
        component={LostPetQrScreen}
        options={{ title: '毛孩身份 QR' }}
      />
      <ProfileStackNav.Screen
        name="About"
        component={AboutScreen}
        options={{ title: '關於 MEGO' }}
      />
      <ProfileStackNav.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: '隱私政策' }}
      />
      <ProfileStackNav.Screen
        name="TermsOfUse"
        component={TermsOfUseScreen}
        options={{ title: '使用條款' }}
      />
    </ProfileStackNav.Navigator>
  );
}

const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: string; size: number }) => (
  <Ionicons name={name} color={color} size={Math.min(size, 25)} style={{ marginBottom: -2 }} />
);

const tabLabel = (text: string) => ({ focused, color }: { focused: boolean; color: string }) => (
  <View style={styles.tabLabel}>
    <Text style={[styles.tabLabelText, focused && styles.tabLabelActive, { color }]}>{text}</Text>
    {focused && <View style={styles.activeIndicator} />}
  </View>
);

export default function MainTabs() {
  const theme = useTheme();
  return (
    <Tabs.Navigator
      id="MainTabs"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text,
        tabBarStyle: {
          height: 72,
          paddingTop: 3,
          paddingBottom: 8,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          shadowOpacity: 0,
          elevation: 0,
        },
        tabBarBackground: () => <BottomNavigationDock />,
      }}
    >
      <Tabs.Screen
        name="Home"
        component={HomeStack}
        options={{ tabBarIcon: icon('home-outline'), tabBarLabel: tabLabel('首頁') }}
      />
      <Tabs.Screen
        name="Timeline"
        component={TimelineStack}
        options={{ tabBarIcon: icon('journal-outline'), tabBarLabel: tabLabel('紀錄') }}
      />
      <Tabs.Screen
        name="Health"
        component={HealthStack}
        options={{ tabBarIcon: icon('chatbubble-ellipses-outline'), tabBarLabel: tabLabel('AI 助手') }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('Health', { screen: 'HealthOverview' });
          },
        })}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileStack}
        options={{ tabBarIcon: icon('settings-outline'), tabBarLabel: tabLabel('設定') }}
      />
    </Tabs.Navigator>
  );
}
