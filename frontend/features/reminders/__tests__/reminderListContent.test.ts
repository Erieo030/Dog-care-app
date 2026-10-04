jest.mock(
  '../../../assets/artwork/themes/morning-home/page-decorations/reminder-empty-v1.webp',
  () => 1,
);
jest.mock(
  '../../../assets/artwork/themes/afternoon-living-room/page-decorations/reminder-empty-v1.webp',
  () => 1,
);
jest.mock(
  '../../../assets/artwork/themes/garden-walk/page-decorations/reminder-empty-v1.webp',
  () => 1,
);

import type { Reminder } from '../../../types';
import { getVisibleReminders } from '../reminderListContent';

const reminder = (id: string, date: Date, status: Reminder['status'] = 'pending'): Reminder => ({
  id,
  petId: 'pet-1',
  type: 'other',
  title: id,
  scheduledAt: date.toISOString(),
  recurrenceRule: 'none',
  status,
});

const dateKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

describe('getVisibleReminders', () => {
  it('shows all reminders scheduled on the selected calendar date, including completed items', () => {
    const selectedDay = new Date(2026, 8, 28);
    const items = [
      reminder('morning', new Date('2026-09-28T08:00:00+08:00'), 'completed'),
      reminder('evening', new Date('2026-09-28T20:00:00+08:00'), 'pending'),
      reminder('tomorrow', new Date('2026-09-29T08:00:00+08:00')),
    ];

    expect(
      getVisibleReminders(items, undefined, dateKey(selectedDay)).map((item) => item.id),
    ).toEqual(['morning', 'evening']);
  });

  it('uses Taipei midnight boundaries when filtering a selected calendar date', () => {
    const items = [
      reminder('before-day', new Date('2026-09-27T15:59:59.999Z')),
      reminder('midnight', new Date('2026-09-27T16:00:00.000Z')),
      reminder('last-moment', new Date('2026-09-28T15:59:59.999Z')),
      reminder('next-day', new Date('2026-09-28T16:00:00.000Z')),
    ];
    expect(getVisibleReminders(items, undefined, '2026-09-28').map(({ id }) => id)).toEqual([
      'midnight',
      'last-moment',
    ]);
  });
});
