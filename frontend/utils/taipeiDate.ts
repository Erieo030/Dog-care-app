const TAIPEI_TIME_ZONE = 'Asia/Taipei';

function partsOf(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

/** Date key for a date selected in the device's calendar UI. */
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

/** Calendar date as MEGO defines it: Asia/Taipei, independent of device timezone. */
export function taipeiDateKey(date: Date = new Date()): string {
  const parts = partsOf(date, TAIPEI_TIME_ZONE);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Serialize a calendar selection as a stable date-only value represented at Taipei noon. */
export function toTaipeiDateValue(date: Date): string {
  return `${localDateKey(date)}T12:00:00+08:00`;
}

/** Start of a Taipei calendar day as an absolute timestamp. */
export function taipeiDayStart(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00+08:00`).getTime();
}

export function addDateKeyDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`;
}

export function formatTaipeiDate(
  value: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('zh-TW', { ...options, timeZone: TAIPEI_TIME_ZONE });
}
