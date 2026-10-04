/** 用途：讀取具 ownership、類型篩選與分頁的毛孩統一時間軸。 */
import { apiData } from './api';
import { TimelineCalendar, TimelineItem, TimelinePage, TimelineType } from '../types';
import { addDateKeyDays, localDateKey, taipeiDayStart } from '../utils/taipeiDate';
export const getTimelinePage = async (
  userId: string,
  petId: string,
  options: {
    limit?: number;
    skip?: number;
    type?: TimelineType;
    startAt?: string;
    endAt?: string;
    signal?: AbortSignal;
  } = {},
): Promise<TimelinePage> => {
  const query = new URLSearchParams({
    userId,
    limit: String(options.limit ?? 20),
    skip: String(options.skip ?? 0),
  });
  if (options.type) query.set('type', options.type);
  if (options.startAt) query.set('startAt', options.startAt);
  if (options.endAt) query.set('endAt', options.endAt);
  const path = `/api/pets/${petId}/timeline?${query.toString()}`;
  return options.signal
    ? apiData<TimelinePage>(path, { signal: options.signal })
    : apiData<TimelinePage>(path);
};
export const getRecentTimeline = async (userId: string, petId: string, limit = 5) =>
  (await getTimelinePage(userId, petId, { limit, skip: 0 })).items;

export const getTimelineCalendar = async (
  userId: string,
  petId: string,
  options: { startAt: string; endAt: string; timeZone?: string; signal?: AbortSignal },
): Promise<TimelineCalendar> => {
  const query = new URLSearchParams({
    userId,
    startAt: options.startAt,
    endAt: options.endAt,
    timeZone: options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Taipei',
  });
  const path = `/api/pets/${petId}/timeline/calendar?${query.toString()}`;
  return options.signal
    ? apiData<TimelineCalendar>(path, { signal: options.signal })
    : apiData<TimelineCalendar>(path);
};

export const getTimelineDay = async (
  userId: string,
  petId: string,
  date: Date,
  signal?: AbortSignal,
): Promise<TimelineItem[]> => {
  const selectedDate = localDateKey(date);
  const start = new Date(taipeiDayStart(selectedDate)).toISOString();
  const end = new Date(taipeiDayStart(addDateKeyDays(selectedDate, 1))).toISOString();
  const items: TimelineItem[] = [];
  let skip = 0;
  let hasMore = true;
  while (hasMore) {
    const page = await getTimelinePage(userId, petId, {
      limit: 50,
      skip,
      startAt: start,
      endAt: end,
      signal,
    });
    items.push(...page.items);
    skip = page.nextSkip;
    hasMore = page.hasMore;
  }
  return items;
};
