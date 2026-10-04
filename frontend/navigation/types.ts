/** 用途：集中定義導航頁面名稱與參數。 */
import { NavigatorScreenParams } from '@react-navigation/native';
import {
  DailyLog,
  Vaccination,
  Deworming,
  MedicationCourse,
  HealthEventType,
  MedicalVisit,
  ObservationHealthEventType,
  Reminder,
  WeightRecord,
} from '../types';

export type AuthStackParamList = { Login: undefined; Register: undefined };
export type PetSetupStackParamList = { CreatePet: undefined };
export type HomeStackParamList = {
  HomeOverview: undefined;
  DailyLog:
    | { record?: DailyLog; recordId?: string; recordDate?: string; quickEntry?: boolean }
    | undefined;
  VaccinationList: undefined;
  VaccinationForm: { record?: Vaccination; duplicate?: boolean; quickEntry?: boolean } | undefined;
  VaccinationDetail: { recordId: string };
  DewormingList: undefined;
  DewormingForm: { record?: Deworming; duplicate?: boolean; quickEntry?: boolean } | undefined;
  DewormingDetail: { recordId: string };
  MedicationList: undefined;
  MedicationForm:
    | { record?: MedicationCourse; duplicate?: boolean; quickEntry?: boolean }
    | undefined;
  MedicationDetail: { recordId: string };
  HealthOverview: undefined;
  TimelineOverview: undefined;
  AddPet: undefined;
  EditPet: undefined;
  ReminderList:
    | { focusReminderId?: string; upcomingDays?: number; scheduledDate?: string }
    | undefined;
  CreateReminder: { reminder?: Reminder; quickEntry?: boolean } | undefined;
  AbnormalType: { quickEntry?: boolean } | undefined;
  CreateHealthEvent: { type: HealthEventType; label: string; quickEntry?: boolean };
  VomitingHealthEvent: { eventId?: string; quickEntry?: boolean };
  StoolHealthEvent: { eventId?: string; quickEntry?: boolean };
  ObservationHealthEvent: {
    type: ObservationHealthEventType;
    eventId?: string;
    quickEntry?: boolean;
  };
  HealthObservation: undefined;
  HealthEventList: undefined;
  HealthEventDetail: { eventId: string };
  HealthEventEdit: { eventId: string };
  WeightList: { focusRecordId?: string } | undefined;
  WeightForm: { record?: WeightRecord; quickEntry?: boolean };
  MedicalVisitList: undefined;
  MedicalVisitForm: { visit?: MedicalVisit; duplicate?: boolean; quickEntry?: boolean };
  MedicalVisitDetail: { visitId: string };
};
export type ProfileStackParamList = {
  ProfileOverview: undefined;
  HomeTheme: undefined;
  AccountInfo: undefined;
  AIUsage: undefined;
  AIDataUseInfo: undefined;
  PetManagement: undefined;
  EditPet: undefined;
  NotificationSettings: undefined;
  ExportCenter: undefined;
  LostPetSettings: undefined;
  LostPetQr: undefined;
  About: undefined;
  PrivacyPolicy: undefined;
  TermsOfUse: undefined;
};
export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Timeline: NavigatorScreenParams<HomeStackParamList> | undefined;
  Health: NavigatorScreenParams<HomeStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

/** Full-screen authenticated routes presented above the persistent tab navigator. */
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  AIChat: undefined;
  VetVisitBrief: undefined;
};
