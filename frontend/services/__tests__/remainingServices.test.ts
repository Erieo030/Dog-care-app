import { apiData } from '../api';
import { getTodayDailyLog, createDailyLog } from '../dailyLogService';
import { createExport, cancelExport } from '../exportService';
import { getLostProfile, rotateLostToken, saveLostProfile } from '../lostPetService';
import { loadSettings, timeOnDate, DEFAULT_SETTINGS } from '../settingsService';
import { sendAIChat, getVetVisitBrief } from '../aiService';

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

test('both system and AI pre-vet requests forward the cancellation signal', async () => {
  const controller = new AbortController();
  request.mockResolvedValue({});
  await getVetVisitBrief('u1', 'p1', 7, false, ['health'], controller.signal);
  await getVetVisitBrief('u1', 'p1', 7, true, ['health'], controller.signal);
  expect(request.mock.calls[0][1]?.signal).toBe(controller.signal);
  expect(request.mock.calls[1][1]?.signal).toBe(controller.signal);
  expect(request.mock.calls[1][0]).toContain('includeNarrative=true');
});

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
    format: 'pdf',
    scope: 'current_pet',
    petId: 'p1',
    period: 'all',
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

test('AI chat sends only the latest ten turns for the active conversation', async () => {
  request.mockResolvedValueOnce({ answer: '回覆', conversationId: 'session-1' });
  const history = Array.from({ length: 12 }, (_, index) => ({
    role: index % 2 ? ('assistant' as const) : ('user' as const),
    content: `turn-${index}`,
  }));
  await sendAIChat('user-1', 'pet-1', 'follow-up', 30, 'session-1', 'general', history);
  const body = JSON.parse(String(request.mock.calls[0][1]?.body));
  expect(body.conversationId).toBe('session-1');
  expect(body.history).toHaveLength(10);
  expect(body.history[0].content).toBe('turn-2');
  expect(body.history[9].content).toBe('turn-11');

  request.mockResolvedValueOnce({ answer: '回覆', conversationId: 'session-1' });
  await sendAIChat('user-1', 'pet-1', 'follow-up', 30, 'session-1', 'general', [
    { role: 'assistant', content: '長回覆'.repeat(400) },
  ]);
  const boundedBody = JSON.parse(String(request.mock.calls[1][1]?.body));
  expect(boundedBody.history[0].content).toHaveLength(1000);
});
