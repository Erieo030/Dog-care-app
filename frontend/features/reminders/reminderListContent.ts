import type { ImageSourcePropType } from 'react-native';

import type { Reminder } from '../../types';

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

export function getVisibleReminders(items: Reminder[], upcomingDays?: number) {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const start = upcomingDays === 0 ? todayStart.getTime() : now;
  const end =
    upcomingDays === 0
      ? todayStart.getTime() + 24 * 60 * 60 * 1000 - 1
      : now + (upcomingDays ?? 365) * 24 * 60 * 60 * 1000;

  return items.filter((item) => {
    const scheduledAt = new Date(item.scheduledAt).getTime();
    return (
      (item.status === 'pending' || item.status === 'snoozed') &&
      scheduledAt >= start &&
      scheduledAt <= end
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
      const date = new Date(item.scheduledAt);
      const key = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
        .map((part) => String(part).padStart(2, '0'))
        .join('-');
      groups.set(key, [...(groups.get(key) || []), item]);
    });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from(groups.entries()).flatMap(([key, group]) => {
    const date = new Date(`${key}T12:00:00`);
    const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
    const title =
      diff === 0
        ? '今天'
        : diff === 1
          ? '明天'
          : date.toLocaleDateString('zh-TW', {
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
