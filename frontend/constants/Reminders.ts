/** 用途：集中提醒畫面的週期選項與「今晚」時間規則。 */
import { RecurrenceRule, ReminderType } from '../types';

export const TONIGHT_HOUR = 20;
export const REMINDER_TYPES: Array<[ReminderType, string, RecurrenceRule]> = [
  ['vaccine', '疫苗', 'yearly'],
  ['deworming_internal', '體內驅蟲', 'quarterly'],
  ['deworming_external', '體外驅蟲', 'monthly'],
  ['heartworm', '心絲蟲預防', 'monthly'],
  ['medication', '吃藥', 'none'],
  ['follow_up', '回診', 'none'],
  ['bath', '洗澡', 'none'],
  ['grooming', '美容', 'none'],
  ['restock', '補貨', 'none'],
  ['other', '其他', 'none'],
];
export const RECURRENCE_RULES: Array<[RecurrenceRule, string]> = [
  ['none', '不重複'],
  ['daily', '每天'],
  ['weekly', '每週'],
  ['monthly', '每月'],
  ['quarterly', '每 3 個月'],
  ['half_yearly', '每半年'],
  ['yearly', '每年'],
];

export function tonightAt(now = new Date(), value = '20:00') {
  const [hour, minute] = value.split(':').map(Number);
  const date = new Date(now);
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() <= now.getTime()) date.setDate(date.getDate() + 1);
  return date;
}
