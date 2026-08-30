import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateEmptyAISession, loadAISession, loadAISessions, saveActiveAISession } from '../aiSessionService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  jest.clearAllMocks();
  storage.getItem.mockResolvedValue(null);
  storage.setItem.mockResolvedValue();
});

test('active session writes messages to history immediately', async () => {
  await activateEmptyAISession('u1', 'p1');
  await saveActiveAISession('u1', 'p1', [
    { role: 'user', text: '最近體重如何？' },
    { role: 'assistant', text: '最近一次體重為 8 公斤。' },
  ]);
  expect(storage.setItem).toHaveBeenCalledWith(
    'mego:ai-sessions:u1:p1',
    expect.stringContaining('最近體重如何？'),
  );
});

test('invalid stored session falls back to an empty session list', async () => {
  storage.getItem.mockResolvedValue('{bad-json');
  await expect(loadAISession('u1', 'p1')).resolves.toEqual({});
  await expect(loadAISessions('u1', 'p1')).resolves.toEqual([]);
});
