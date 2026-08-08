/** 用途：組合全部功能 Stack 與四個主要底部分頁。 */
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AbnormalRecordTypeScreen from '../screens/AbnormalRecordTypeScreen';
import CreateHealthEventScreen from '../screens/CreateHealthEventScreen';
import CreateReminderScreen from '../screens/CreateReminderScreen';
import DailyLogScreen from '../screens/DailyLogScreen';
import VomitingHealthEventScreen from '../screens/VomitingHealthEventScreen';
import StoolHealthEventScreen from '../screens/StoolHealthEventScreen';
import ObservationHealthEventScreen from '../screens/ObservationHealthEventScreen';
import FeaturePreviewScreen from '../screens/FeaturePreviewScreen';
import HealthEventDetailScreen from '../screens/HealthEventDetailScreen';
import HealthEventEditScreen from '../screens/HealthEventEditScreen';
import HealthEventListScreen from '../screens/HealthEventListScreen';
import HealthHubScreen from '../screens/HealthHubScreen';
import HomeScreen from '../screens/HomeScreen';
import GlobalSearchScreen from '../screens/GlobalSearchScreen';
import { AddPetScreen, EditPetScreen } from '../screens/ManagePetScreen';
import MedicalVisitDetailScreen from '../screens/MedicalVisitDetailScreen';
import MedicalVisitFormScreen from '../screens/MedicalVisitFormScreen';
import MedicalVisitListScreen from '../screens/MedicalVisitListScreen';
import ProfileScreen, { AccountInfoScreen } from '../screens/ProfileScreen';
import {
  AboutScreen,
  AppearanceSettingsScreen,
  FeedbackScreen,
  LocalDataSettingsScreen,
  NotificationSettingsScreen,
  PetManagementScreen,
  PrivacyPolicyScreen,
  ReminderPreferencesScreen,
  StorageSettingsScreen,
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

const Tabs = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<HomeStackParamList>();
const HealthStackNav = createNativeStackNavigator<HomeStackParamList>();
const TimelineStackNav = createNativeStackNavigator<HomeStackParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();

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
      options={{ title: '疫苗紀錄' }}
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
      options={{ title: '驅蟲紀錄' }}
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
      options={{ title: '用藥管理' }}
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
      options={{ title: '就醫紀錄' }}
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
    <Stack.Navigator id="HomeStack">
      <Stack.Screen name="HomeOverview" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DailyLog" component={DailyLogScreen} options={{ title: '今日紀錄' }} />
      <Stack.Screen
        name="GlobalSearch"
        component={GlobalSearchScreen}
        options={{ title: '搜尋與篩選' }}
      />
      <Stack.Screen name="AddPet" component={AddPetScreen} />
      <Stack.Screen name="EditPet" component={EditPetScreen} />
      <Stack.Screen name="ReminderList" component={ReminderListScreen} />
      <Stack.Screen name="CreateReminder" component={CreateReminderScreen} />
      <Stack.Screen name="AbnormalType" component={AbnormalRecordTypeScreen} />
      <Stack.Screen name="CreateHealthEvent" component={CreateHealthEventScreen} />
      {sharedHealthScreens(Stack)}
      <Stack.Screen name="FeaturePreview" component={FeaturePreviewScreen} />
    </Stack.Navigator>
  );
}

function HealthStack() {
  return (
    <HealthStackNav.Navigator id="HealthStack">
      <HealthStackNav.Screen
        name="HealthOverview"
        component={HealthHubScreen}
        options={{ headerShown: false }}
      />
      {sharedHealthScreens(HealthStackNav)}
    </HealthStackNav.Navigator>
  );
}

function TimelineStack() {
  return (
    <TimelineStackNav.Navigator id="TimelineStack">
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
    <ProfileStackNav.Navigator id="ProfileStack">
      <ProfileStackNav.Screen
        name="ProfileOverview"
        component={ProfileScreen}
        options={{ headerShown: false }}
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
        name="AppearanceSettings"
        component={AppearanceSettingsScreen}
        options={{ title: '外觀' }}
      />
      <ProfileStackNav.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: '通知設定' }}
      />
      <ProfileStackNav.Screen
        name="ReminderPreferences"
        component={ReminderPreferencesScreen}
        options={{ title: '提醒偏好' }}
      />
      <ProfileStackNav.Screen
        name="ExportCenter"
        component={ExportCenterScreen}
        options={{ title: '匯出中心' }}
      />
      <ProfileStackNav.Screen
        name="LostPetSettings"
        component={LostPetSettingsScreen}
        options={{ title: '走失協尋 QR' }}
      />
      <ProfileStackNav.Screen
        name="LostPetQr"
        component={LostPetQrScreen}
        options={{ title: '協尋 QR Code' }}
      />
      <ProfileStackNav.Screen
        name="StorageSettings"
        component={StorageSettingsScreen}
        options={{ title: '儲存空間' }}
      />
      <ProfileStackNav.Screen
        name="LocalDataSettings"
        component={LocalDataSettingsScreen}
        options={{ title: '本機資料與偏好' }}
      />
      <ProfileStackNav.Screen
        name="About"
        component={AboutScreen}
        options={{ title: '關於 PawLog' }}
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
      <ProfileStackNav.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{ title: '問題回報' }}
      />
    </ProfileStackNav.Navigator>
  );
}

const icon = (value: string) => () => <Text style={{ fontSize: 20 }}>{value}</Text>;

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
          height: 66,
          paddingTop: 6,
          paddingBottom: 8,
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="Home"
        component={HomeStack}
        options={{ title: '首頁', tabBarIcon: icon('🏠') }}
      />
      <Tabs.Screen
        name="Timeline"
        component={TimelineStack}
        options={{ title: '紀錄', tabBarIcon: icon('📝') }}
      />
      <Tabs.Screen
        name="Health"
        component={HealthStack}
        options={{ title: '健康', tabBarIcon: icon('❤️') }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileStack}
        options={{ title: '我的', tabBarIcon: icon('🐾') }}
      />
    </Tabs.Navigator>
  );
}
