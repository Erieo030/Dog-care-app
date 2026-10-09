import {
  groupPhotoRows,
  photoRecordTarget,
  photoWeekKey,
  shiftPhotoMonth,
} from '../carePhotoContent';
import { photo } from './carePhotoFixture';
import {
  getDockSlotWidth,
  DOCK_HORIZONTAL_PADDING,
  TAB_ITEM_MARGIN,
  DOCK_EDGE,
} from '../../../components/navigation/bottomNavigationLayout';
import { getCarePhotos } from '../../../services/carePhotoService';
import { apiData } from '../../../services/api';

jest.mock('../../../services/api', () => ({ apiData: jest.fn() }));

test('weeks start Monday and work across month and year boundaries', () => {
  expect(photoWeekKey('2026-10-01')).toBe('2026-09-28');
  expect(photoWeekKey('2026-10-04')).toBe('2026-09-28');
  expect(photoWeekKey('2026-10-05')).toBe('2026-10-05');
  expect(photoWeekKey('2027-01-01')).toBe('2026-12-28');
  expect(shiftPhotoMonth('2026-12', 1)).toBe('2027-01');
  expect(shiftPhotoMonth('2026-01', -1)).toBe('2025-12');
});

test('groups newest photos first and splits each week into complete grid rows', () => {
  const items = [photo('a'), photo('b', '2026-10-05'), photo('c'), photo('d')];
  const sections = groupPhotoRows(items, 2);
  expect(sections.map((section) => section.title)).toEqual(['2026-10-05', '2026-09-28']);
  expect(sections[1].data.map((row) => row.length)).toEqual([2, 1]);
  expect(sections.flatMap((section) => section.data.flat()).map((item) => item.id)).toEqual([
    'b',
    'd',
    'c',
    'a',
  ]);
  expect(items.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
});

test('photos point to the original health, weight or visit record', () => {
  expect(photoRecordTarget(photo('h'))).toEqual({
    name: 'HealthEventDetail',
    params: { eventId: 'record-h' },
  });
  expect(photoRecordTarget(photo('m', undefined, { sourceType: 'medical_visit' }))).toEqual({
    name: 'MedicalVisitDetail',
    params: { visitId: 'record-m' },
  });
  expect(photoRecordTarget(photo('w', undefined, { sourceType: 'weight' }))).toEqual({
    name: 'WeightList',
    params: { focusRecordId: 'record-w' },
  });
});

test.each([320, 375, 390, 430])(
  'six navigation slots retain touch width and symmetric capsule edges at %i px',
  (width) => {
    const slot = getDockSlotWidth(width, 6);
    const bubbleWidth = slot - TAB_ITEM_MARGIN * 2;
    expect(bubbleWidth).toBeGreaterThanOrEqual(44);
    const left = DOCK_HORIZONTAL_PADDING + TAB_ITEM_MARGIN;
    const right = width - (left + 5 * slot + bubbleWidth);
    expect(left - DOCK_EDGE).toBeCloseTo(right - DOCK_EDGE);
  },
);

test('photo listing forwards cancellation, scope, filter and pagination', async () => {
  const controller = new AbortController();
  (apiData as jest.Mock).mockResolvedValue({ items: [], total: 0, hasMore: false });
  await getCarePhotos(
    'user@example.com',
    'p1',
    { month: '2026-10', category: 'medical', skip: 50 },
    controller.signal,
  );
  expect(apiData).toHaveBeenCalledWith(
    '/api/pets/p1/care-photos?userId=user%40example.com&month=2026-10&category=medical&skip=50&limit=50',
    { signal: controller.signal },
  );
});
