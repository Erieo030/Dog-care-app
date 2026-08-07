/** 用途：集中定義導航頁面名稱與參數。 */
import { NavigatorScreenParams } from '@react-navigation/native';
import { HealthEventType, MedicalVisit, ObservationHealthEventType, Reminder, WeightRecord } from '../types';

export type AuthStackParamList = { Login: undefined; Register: undefined };
export type PetSetupStackParamList = { CreatePet: undefined };
export type HomeStackParamList = {
  HomeOverview: undefined;
  HealthOverview: undefined;
  TimelineOverview: undefined;
  AddPet: undefined;
  EditPet: undefined;
  ReminderList: { focusReminderId?: string } | undefined;
  CreateReminder: { reminder?: Reminder } | undefined;
  AbnormalType: undefined;
  CreateHealthEvent: { type: HealthEventType; label: string };
  VomitingHealthEvent: { eventId?: string };
  StoolHealthEvent: { eventId?: string };
  ObservationHealthEvent: { type: ObservationHealthEventType; eventId?: string };
  HealthEventList: undefined;
  HealthEventDetail: { eventId: string };
  HealthEventEdit: { eventId: string };
  WeightList: { focusRecordId?: string } | undefined;
  WeightForm: { record?: WeightRecord };
  MedicalVisitList: undefined;
  MedicalVisitForm: { visit?: MedicalVisit };
  MedicalVisitDetail: { visitId: string };
  GlobalSearch: undefined;
  FeaturePreview: { title: string; description: string };
};
export type ProfileStackParamList = {
  ProfileOverview: undefined; AccountInfo: undefined; PetManagement: undefined;
  AppearanceSettings: undefined; NotificationSettings: undefined; ReminderPreferences: undefined;
  ExportCenter: undefined; StorageSettings: undefined; LocalDataSettings: undefined;
  About: undefined; PrivacyPolicy: undefined; TermsOfUse: undefined; Feedback: undefined;
};
export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Timeline: NavigatorScreenParams<HomeStackParamList> | undefined;
  Health: NavigatorScreenParams<HomeStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
