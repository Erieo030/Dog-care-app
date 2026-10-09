import type { CarePhoto } from '../carePhotoContent';

export const photo = (
  id: string,
  date = '2026-10-01',
  patch: Partial<CarePhoto> = {},
): CarePhoto => ({
  id,
  petId: 'p1',
  sourceType: 'health_event',
  sourceId: `record-${id}`,
  storageProvider: 'local',
  fileName: 'photo.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 10,
  contentPath: `/api/attachments/${id}/content`,
  recordAt: `${date}T12:00:00+08:00`,
  recordDate: date,
  category: 'health',
  categoryLabel: '健康異常',
  title: '皮膚觀察',
  notes: '觀察變化',
  sensitive: true,
  ...patch,
});
