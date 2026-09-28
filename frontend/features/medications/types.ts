/**
 * 用途：用藥功能內部表單型別與預設值。
 * 畫面入口：screens/MedicationFormScreen.tsx
 * API：../../../services/medicationService.ts
 */
import type { MedicationCourse, MedicationMealTiming } from '../../types';

export type MedicationDraft = {
  name: string;
  instructions: string;
  timesPerDay: number;
  startDate: string;
  endDate: string;
  mealTiming: MedicationMealTiming;
  notes: string;
  status: MedicationCourse['status'];
  reminderEnabled: boolean;
  reminderTimes: string[];
  reminderTimeDraft: string;
  medicalVisitId?: string;
  [key: string]: string | number | boolean | string[] | undefined;
};

export const mealTimingLabels: Record<MedicationMealTiming, string> = {
  before_meal: '飯前',
  after_meal: '飯後',
  anytime: '不限',
};

export const createBlankMedicationDraft = (): MedicationDraft => ({
  name: '',
  instructions: '',
  timesPerDay: 1,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  mealTiming: 'anytime',
  notes: '',
  status: 'active',
  reminderEnabled: false,
  reminderTimes: [],
  reminderTimeDraft: '',
});

export const timeValue = (value?: string) => {
  const [hour, minute] = (value || '08:00').split(':').map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(hour) ? hour : 8, Number.isFinite(minute) ? minute : 0, 0, 0);
  return date;
};
