import {
  addDateKeyDays,
  formatTaipeiDate,
  localDateKey,
  taipeiDateKey,
  taipeiDayStart,
  toTaipeiDateValue,
} from '../taipeiDate';

test('Taipei date key changes at the Taiwan calendar-day boundary', () => {
  expect(taipeiDateKey(new Date('2026-09-30T15:59:59.999Z'))).toBe('2026-09-30');
  expect(taipeiDateKey(new Date('2026-09-30T16:00:00.000Z'))).toBe('2026-10-01');
});

test('picker serialization preserves the calendar date and records Taiwan noon', () => {
  const selected = new Date(2026, 8, 30, 12);
  expect(localDateKey(selected)).toBe('2026-09-30');
  expect(toTaipeiDateValue(selected)).toBe('2026-09-30T12:00:00+08:00');
});

test('Taipei day boundaries and calendar arithmetic cross month/year correctly', () => {
  expect(new Date(taipeiDayStart('2026-10-01')).toISOString()).toBe('2026-09-30T16:00:00.000Z');
  expect(addDateKeyDays('2026-12-31', 1)).toBe('2027-01-01');
});

test('formatting uses Taipei date even when the ISO instant is on the previous UTC day', () => {
  expect(formatTaipeiDate('2026-09-30T16:00:00.000Z')).toContain('2026/10/1');
});
