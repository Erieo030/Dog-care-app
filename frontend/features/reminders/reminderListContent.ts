import type { ImageSourcePropType } from 'react-native';

import type { Reminder } from '../../types';
import {
  addDateKeyDays,
  formatTaipeiDate,
  taipeiDateKey,
  taipeiDayStart,
} from '../../utils/taipeiDate';

export const REMINDER_ARTWORKS: Record<string, ImageSourcePropType> = {
  'morning-home': require('../../assets/artwork/themes/morning-home/page-decorations/reminder-empty-v1.webp'),
  'afternoon-living-room': require('../../assets/artwork/themes/afternoon-living-room/page-decorations/reminder-empty-v1.webp'),
  'garden-walk': require('../../assets/artwork/themes/garden-walk/page-decorations/reminder-empty-v1.webp'),
};

export const REMINDER_STATUS_LABELS: Record<Reminder['status'], string> = {
  pending: '待完成',
  snoozed: '已延後',
  completed: '已完成',
  skipped: '已略過',
};

export type ReminderListEntry =
  | { kind: 'heading'; id: string; title: string }
  | { kind: 'item'; id: string; item: Reminder };

export function getVisibleReminders(
  items: Reminder[],
  upcomingDays?: number,
  scheduledDate?: string,
) {
  if (scheduledDate) {
    const start = taipeiDayStart(scheduledDate);
    const end = taipeiDayStart(addDateKeyDays(scheduledDate, 1));
    return items.filter((item) => {
      const scheduledAt = new Date(item.scheduledAt).getTime();
      return scheduledAt >= start && scheduledAt < end;
    });
  }
  const now = Date.now();
  const todayStart = taipeiDayStart(taipeiDateKey());
  const start = upcomingDays === 0 ? todayStart : now;
  const end =
    upcomingDays === 0
      ? taipeiDayStart(addDateKeyDays(taipeiDateKey(), 1))
      : now + (upcomingDays ?? 365) * 24 * 60 * 60 * 1000;

  return items.filter((item) => {
    const scheduledAt = new Date(item.scheduledAt).getTime();
    return (
      (item.status === 'pending' || item.status === 'snoozed') &&
      scheduledAt >= start &&
      (upcomingDays === 0 ? scheduledAt < end : scheduledAt <= end)
    );
  });
}

export function groupReminderEntries(items: Reminder[]): ReminderListEntry[] {
  const groups = new Map<string, Reminder[]>();
  [...items]
    .sort(
      (left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
    )
    .forEach((item) => {
      const key = taipeiDateKey(new Date(item.scheduledAt));
      groups.set(key, [...(groups.get(key) || []), item]);
    });

  const todayKey = taipeiDateKey();
  const todayOrdinal = taipeiDayStart(todayKey);
  return Array.from(groups.entries()).flatMap(([key, group]) => {
    const diff = Math.round((taipeiDayStart(key) - todayOrdinal) / 86400000);
    const title =
      diff === 0
        ? '今天'
        : diff === 1
          ? '明天'
          : formatTaipeiDate(new Date(`${key}T12:00:00+08:00`), {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            });
    return [
      { kind: 'heading' as const, id: `heading-${key}`, title },
      ...group.map((item) => ({ kind: 'item' as const, id: item.id, item })),
    ];
  });
}
