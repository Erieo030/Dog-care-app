jest.mock('expo/virtual/env', () => ({ env: process.env }));

const previousBase = process.env.EXPO_PUBLIC_API_BASE_URL;
const previousUrl = process.env.EXPO_PUBLIC_API_URL;

afterEach(() => {
  if (previousBase === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
  else process.env.EXPO_PUBLIC_API_BASE_URL = previousBase;
  if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = previousUrl;
  jest.resetModules();
});

test.each([
  ['', 'http://192.168.1.10:8000', 'http://192.168.1.10:8000'],
  ['   ', ' http://192.168.1.10:8000/ ', 'http://192.168.1.10:8000'],
  [' https://api.example.com/ ', 'http://192.168.1.10:8000', 'https://api.example.com'],
  ['', '', ''],
])('API URL resolves blank override and explicit override (%s)', (base, url, expected) => {
  process.env.EXPO_PUBLIC_API_BASE_URL = base;
  process.env.EXPO_PUBLIC_API_URL = url;
  jest.resetModules();
  expect(require('../api').API_BASE_URL).toBe(expected);
});

test('missing configuration keeps the explicit configuration error', async () => {
  delete process.env.EXPO_PUBLIC_API_BASE_URL;
  delete process.env.EXPO_PUBLIC_API_URL;
  jest.resetModules();
  const { apiRequest } = require('../api');
  await expect(apiRequest('/api/pets')).rejects.toThrow('尚未設定 EXPO_PUBLIC_API_BASE_URL');
});
