import {
  buildCalendarDays,
  getItemsForLocalDate,
  getLocalDateKey,
  getTimelineCategory,
  getTimelineCategoriesForDay,
  TIMELINE_CATEGORIES,
} from '../timelineContent';
import { RECORD_CATEGORY_COLORS } from '../../../constants/RecordCategoryColors';
import type { TimelineItem } from '../../../types';

const makeItem = (overrides: Partial<TimelineItem> = {}): TimelineItem => ({
  id: 'record-1',
  petId: 'pet-1',
  type: 'daily_log',
  occurredAt: '2026-09-26T02:00:00.000Z',
  title: '日常紀錄',
  description: '',
  sourceId: 'source-1',
  sourceType: 'daily_log',
  createdAt: '2026-09-26T02:00:00.000Z',
  updatedAt: '2026-09-26T02:00:00.000Z',
  attachmentCount: 0,
  ...overrides,
});

test('calendar creates complete weeks containing every day of a month', () => {
  const days = buildCalendarDays(new Date(2026, 8, 1));
  expect(days.length % 7).toBe(0);
  expect(days.some((date) => getLocalDateKey(date) === '2026-09-01')).toBe(true);
  expect(days.some((date) => getLocalDateKey(date) === '2026-09-30')).toBe(true);
});

test('selected-day records are filtered by local calendar date and ordered by time', () => {
  const items = [
    makeItem({ id: 'late', occurredAt: '2026-09-26T12:30:00.000Z' }),
    makeItem({ id: 'other-day', occurredAt: '2026-09-25T12:30:00.000Z' }),
    makeItem({ id: 'early', occurredAt: '2026-09-26T01:30:00.000Z' }),
  ];
  expect(getItemsForLocalDate(items, new Date(2026, 8, 26)).map((item) => item.id)).toEqual([
    'early',
    'late',
  ]);
});

test('timeline types are grouped into calendar legend categories', () => {
  expect(getTimelineCategory('reminder_completed')).toBe('reminder');
  expect(getTimelineCategory('health_event')).toBe('health');
  expect(getTimelineCategory('vaccination')).toBe('care');
});

test('same-day repeated records share one marker per category', () => {
  const categories = getTimelineCategoriesForDay([
    makeItem({ id: 'daily-1', type: 'daily_log' }),
    makeItem({ id: 'daily-2', type: 'daily_log' }),
    makeItem({ id: 'health-1', type: 'health_event' }),
    makeItem({ id: 'health-2', type: 'health_event' }),
    makeItem({ id: 'weight-1', type: 'weight' }),
  ]);

  expect(categories).toEqual(['daily', 'health', 'weight']);
});

test('calendar legend uses the shared category palette', () => {
  TIMELINE_CATEGORIES.forEach(({ key, color }) => {
    expect(color).toBe(RECORD_CATEGORY_COLORS[key]);
  });
});
