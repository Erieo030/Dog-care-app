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
  DailyLog: { record?: DailyLog; recordId?: string; recordDate?: string } | undefined;
  VaccinationList: undefined;
  VaccinationForm: { record?: Vaccination; duplicate?: boolean } | undefined;
  VaccinationDetail: { recordId: string };
  DewormingList: undefined;
  DewormingForm: { record?: Deworming; duplicate?: boolean } | undefined;
  DewormingDetail: { recordId: string };
  MedicationList: undefined;
  MedicationForm: { record?: MedicationCourse; duplicate?: boolean } | undefined;
  MedicationDetail: { recordId: string };
  HealthOverview: undefined;
  TimelineOverview: undefined;
  AddPet: undefined;
  EditPet: undefined;
  ReminderList: { focusReminderId?: string; upcomingDays?: number } | undefined;
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
  MedicalVisitForm: { visit?: MedicalVisit; duplicate?: boolean };
  MedicalVisitDetail: { visitId: string };
  AIChat: undefined;
  VetVisitBrief: undefined;
};
export type ProfileStackParamList = {
  ProfileOverview: undefined;
  AccountInfo: undefined;
  AIUsage: undefined;
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
