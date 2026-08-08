import { apiData } from '../api';
import { getTodayDailyLog, createDailyLog } from '../dailyLogService';
import { createExport, cancelExport } from '../exportService';
import { getLostProfile, rotateLostToken, saveLostProfile } from '../lostPetService';
import { loadSettings, timeOnDate, DEFAULT_SETTINGS } from '../settingsService';

jest.mock('../api', () => ({ apiData: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  makeDirectoryAsync: jest.fn(),
  downloadAsync: jest.fn(),
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { PNG: 'png', JPEG: 'jpeg' },
  manipulateAsync: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-file-system', () => ({ File: jest.fn() }));
const request = apiData as jest.MockedFunction<typeof apiData>;
beforeEach(() => jest.clearAllMocks());

test('daily log service addresses today and create endpoints', async () => {
  request.mockResolvedValueOnce({ record: null });
  await getTodayDailyLog('user@example.com', 'p1', '2026-08-08');
  expect(request.mock.calls[0][0]).toContain('localDate=2026-08-08');
  request.mockResolvedValueOnce({ record: { id: 'd1' } });
  await createDailyLog('u1', 'p1', { loggedAt: '2026-08-08T00:00:00Z', localDate: '2026-08-08' });
  expect(request.mock.calls[1][1]).toMatchObject({ method: 'POST' });
});

test('export service uses envelope and cancellation endpoints', async () => {
  request.mockResolvedValueOnce({ data: { id: 'job-1', status: 'queued' } });
  await createExport('u1', {
    format: 'json',
    scope: 'current_pet',
    petId: 'p1',
    period: 'all',
    includeImages: false,
  });
  request.mockResolvedValueOnce({ data: { id: 'job-1', status: 'cancelled' } });
  await cancelExport('u1', 'job-1');
  expect(request.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  expect(request.mock.calls[1][0]).toContain('/api/exports/job-1');
});

test('lost pet service supports profile save and token rotation', async () => {
  request.mockResolvedValueOnce({ profile: null });
  await getLostProfile('u@example.com', 'p1');
  request.mockResolvedValueOnce({ profile: { enabled: true } });
  await saveLostProfile('u1', 'p1', { enabled: true, contactName: '王先生', contactPhone: '0912' });
  request.mockResolvedValueOnce({ publicToken: 'new-token' });
  await rotateLostToken('u1', 'p1');
  expect(request.mock.calls[1][1]).toMatchObject({ method: 'PUT' });
  expect(request.mock.calls[2][1]).toMatchObject({ method: 'POST' });
});

test('settings validates defaults and local time conversion', async () => {
  const settings = await loadSettings();
  expect(settings).toEqual(DEFAULT_SETTINGS);
  const date = timeOnDate('20:30', new Date('2026-08-08T00:00:00'));
  expect(date.getHours()).toBe(20);
  expect(date.getMinutes()).toBe(30);
});
