import type { Attachment } from '../../types';
import type { HomeStackParamList } from '../../navigation/types';
import { addDateKeyDays, taipeiDayStart } from '../../utils/taipeiDate';

export type CarePhotoCategory = 'all' | 'health' | 'weight' | 'medical';
export interface CarePhoto extends Attachment {
  sourceType: 'health_event' | 'weight' | 'medical_visit';
  sourceId: string;
  recordAt: string;
  recordDate: string;
  category: Exclude<CarePhotoCategory, 'all'>;
  categoryLabel: string;
  title: string;
  notes: string;
  sensitive: boolean;
}
export const CARE_PHOTO_FILTERS: Array<{ key: CarePhotoCategory; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'health', label: '健康異常' },
  { key: 'medical', label: '就醫照片' },
  { key: 'weight', label: '體重' },
];
export const CARE_PHOTO_PAGE_SIZE = 50;

export function shiftPhotoMonth(month: string, offset: number): string {
  const [year, number] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, number - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function photoWeekKey(dateKey: string): string {
  const weekday = new Date(taipeiDayStart(dateKey) + 8 * 3600000).getUTCDay();
  return addDateKeyDays(dateKey, -((weekday + 6) % 7));
}

export function groupPhotoRows(items: CarePhoto[], columns: number) {
  const weeks = new Map<string, CarePhoto[]>();
  [...items]
    .sort((a, b) => b.recordAt.localeCompare(a.recordAt) || b.id.localeCompare(a.id))
    .forEach((item) => {
      const key = photoWeekKey(item.recordDate);
      const photos = weeks.get(key);
      if (photos) photos.push(item);
      else weeks.set(key, [item]);
    });
  return [...weeks].map(([week, photos]) => ({
    title: week,
    data: Array.from({ length: Math.ceil(photos.length / columns) }, (_, i) =>
      photos.slice(i * columns, (i + 1) * columns),
    ),
  }));
}

export type PhotoRecordTarget =
  | { name: 'HealthEventDetail'; params: HomeStackParamList['HealthEventDetail'] }
  | { name: 'MedicalVisitDetail'; params: HomeStackParamList['MedicalVisitDetail'] }
  | { name: 'WeightList'; params: HomeStackParamList['WeightList'] };

export function photoRecordTarget(photo: CarePhoto): PhotoRecordTarget {
  if (photo.sourceType === 'health_event')
    return { name: 'HealthEventDetail', params: { eventId: photo.sourceId } };
  if (photo.sourceType === 'medical_visit')
    return { name: 'MedicalVisitDetail', params: { visitId: photo.sourceId } };
  return { name: 'WeightList', params: { focusRecordId: photo.sourceId } };
}
