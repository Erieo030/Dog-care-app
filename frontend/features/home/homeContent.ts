/** 用途：首頁固定操作項與毛孩年齡顯示規則。 */
import type { Ionicons } from '@expo/vector-icons';
import type { HomeStackParamList } from '../../navigation/types';
import type { RecordCategoryKey } from '../../constants/RecordCategoryColors';

export type HomeIcon = keyof typeof Ionicons.glyphMap;
export type HomeActionItem = [HomeIcon, string, keyof HomeStackParamList];

export const DAILY_ACTIONS: HomeActionItem[] = [
  ['journal-outline', '日常', 'DailyLog'],
  ['alert-circle-outline', '記錄異常', 'AbnormalType'],
  ['scale-outline', '體重', 'WeightForm'],
  ['notifications-outline', '提醒', 'CreateReminder'],
];

export const CARE_ACTIONS: HomeActionItem[] = [
  ['medkit-outline', '疫苗', 'VaccinationForm'],
  ['shield-checkmark-outline', '驅蟲', 'DewormingForm'],
  ['medical-outline', '用藥', 'MedicationForm'],
  ['business-outline', '就醫', 'MedicalVisitForm'],
];

const HOME_ACTION_CATEGORIES: Partial<Record<keyof HomeStackParamList, RecordCategoryKey>> = {
  DailyLog: 'daily',
  AbnormalType: 'health',
  WeightForm: 'weight',
  CreateReminder: 'reminder',
  VaccinationForm: 'care',
  DewormingForm: 'care',
  MedicationForm: 'care',
  MedicalVisitForm: 'care',
};

export function getHomeActionCategory(route: keyof HomeStackParamList): RecordCategoryKey {
  return HOME_ACTION_CATEGORIES[route] || 'care';
}

export const calculatePetAge = (value?: string) => {
  if (!value) return '年齡未設定';
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return '年齡未設定';
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  )
    years--;
  return years > 0 ? `${years} 歲` : '未滿 1 歲';
};
