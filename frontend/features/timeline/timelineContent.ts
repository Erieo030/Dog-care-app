import type { TimelineItem, TimelineType } from '../../types';
import { RECORD_CATEGORY_COLORS, RecordCategoryKey } from '../../constants/RecordCategoryColors';

export const TIMELINE_PAGE_SIZE = 50;

export type TimelineCategory = RecordCategoryKey;

export const TIMELINE_CATEGORIES: Array<{
  key: TimelineCategory;
  label: string;
  color: string;
}> = [
  { key: 'reminder', label: '提醒', color: RECORD_CATEGORY_COLORS.reminder },
  { key: 'daily', label: '日常', color: RECORD_CATEGORY_COLORS.daily },
  { key: 'health', label: '健康異常', color: RECORD_CATEGORY_COLORS.health },
  { key: 'weight', label: '體重', color: RECORD_CATEGORY_COLORS.weight },
  { key: 'care', label: '健康照護', color: RECORD_CATEGORY_COLORS.care },
  { key: 'life', label: '其他', color: RECORD_CATEGORY_COLORS.life },
];

const CATEGORY_BY_TYPE: Record<TimelineType, TimelineCategory> = {
  reminder_completed: 'reminder',
  daily_log: 'daily',
  health_event: 'health',
  weight: 'weight',
  medical_visit: 'care',
  vaccination: 'care',
  deworming: 'care',
  medication: 'care',
  life_event: 'life',
};

export function getTimelineCategory(type: TimelineType): TimelineCategory {
  return CATEGORY_BY_TYPE[type] ?? 'life';
}

export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthRange(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

export function buildCalendarDays(month: Date): Date[] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((startOffset + count) / 7) * 7;
  const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - startOffset);
  return Array.from(
    { length: cellCount },
    (_, index) =>
      new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index),
  );
}

export function getItemsForLocalDate(items: TimelineItem[], date: Date): TimelineItem[] {
  const key = getLocalDateKey(date);
  return items
    .filter((item) => {
      const timestamp = new Date(item.occurredAt);
      return Number.isFinite(timestamp.getTime()) && getLocalDateKey(timestamp) === key;
    })
    .sort(
      (left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime(),
    );
}

export function getTimelineCategoriesForDay(items: TimelineItem[]): TimelineCategory[] {
  return [...new Set(items.map((item) => getTimelineCategory(item.type)))];
}

export function formatTimelineDateHeading(date: Date, today = new Date()): string {
  const weekday = date.toLocaleDateString('zh-TW', { weekday: 'long' });
  const prefix = getLocalDateKey(date) === getLocalDateKey(today) ? '今天' : '';
  return `${prefix}${date.getMonth() + 1} 月 ${date.getDate()} 日，${weekday}`;
}
