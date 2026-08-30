/** 用途：集中提醒畫面的週期選項與「今晚」時間規則。 */
import { RecurrenceRule, ReminderType } from '../types';

export const TONIGHT_HOUR = 20;
export const REMINDER_TYPES: Array<[ReminderType, string, RecurrenceRule]> = [
  ['vaccine', '疫苗', 'yearly'],
  ['deworming', '驅蟲', 'quarterly'],
  ['medication', '用藥', 'none'],
  ['follow_up', '回診', 'none'],
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
