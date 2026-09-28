jest.mock('expo/virtual/env', () => ({ env: process.env }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  process.env.EXPO_PUBLIC_API_URL = '';
  jest.resetModules();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('apiRequest forwards caller cancellation and identifies it separately from timeout', async () => {
  const controller = new AbortController();
  let requestSignal: AbortSignal | undefined;
  global.fetch = jest.fn((_url, init) => {
    requestSignal = init?.signal as AbortSignal;
    return new Promise((_resolve, reject) => {
      requestSignal?.addEventListener('abort', () => {
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      });
    });
  }) as jest.Mock;

  const { apiRequest } = require('../api') as typeof import('../api');
  const pending = apiRequest('/api/register', {
    method: 'POST',
    body: '{}',
    signal: controller.signal,
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  controller.abort();

  await expect(pending).rejects.toMatchObject({
    name: 'ApiError',
    code: 'CANCELLED',
    message: '請求已取消',
  });
  expect(requestSignal?.aborted).toBe(true);
});

test('apiRequest keeps its timeout error distinct from caller cancellation', async () => {
  global.fetch = jest.fn((_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      });
    }),
  ) as jest.Mock;

  const { apiRequest } = require('../api') as typeof import('../api');
  await expect(apiRequest('/api/register', { method: 'POST' }, 5)).rejects.toMatchObject({
    name: 'ApiError',
    code: 'TIMEOUT',
    message: '連線逾時，請稍後再試',
  });
});
