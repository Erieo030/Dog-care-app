import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  activateEmptyAISession,
  deleteAISession,
  loadAISession,
  loadAISessions,
  saveActiveAISession,
} from '../aiSessionService';

const storedValues = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  jest.clearAllMocks();
  storedValues.clear();
  storage.getItem.mockImplementation(async (storageKey) => storedValues.get(storageKey) ?? null);
  storage.setItem.mockImplementation(async (storageKey, value) => {
    storedValues.set(storageKey, value);
  });
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

test('session records remain isolated by user and pet', async () => {
  await activateEmptyAISession('u1', 'p1');
  await saveActiveAISession('u1', 'p1', [{ role: 'user', text: 'Kuro question' }]);
  await activateEmptyAISession('u1', 'p2');
  await saveActiveAISession('u1', 'p2', [{ role: 'user', text: 'Mimi question' }]);
  await activateEmptyAISession('u2', 'p1');
  await saveActiveAISession('u2', 'p1', [{ role: 'user', text: 'Other account question' }]);

  await expect(loadAISessions('u1', 'p1')).resolves.toEqual(
    expect.arrayContaining([expect.objectContaining({ title: 'Kuro question' })]),
  );
  await expect(loadAISessions('u1', 'p2')).resolves.toEqual(
    expect.arrayContaining([expect.objectContaining({ title: 'Mimi question' })]),
  );
  await expect(loadAISessions('u2', 'p1')).resolves.toEqual(
    expect.arrayContaining([expect.objectContaining({ title: 'Other account question' })]),
  );
  await expect(loadAISessions('u1', 'p1')).resolves.not.toEqual(
    expect.arrayContaining([expect.objectContaining({ title: 'Mimi question' })]),
  );
});

test('deleting a session removes only the selected conversation', async () => {
  await activateEmptyAISession('u1', 'p1');
  await saveActiveAISession('u1', 'p1', [{ role: 'user', text: 'first' }]);
  await activateEmptyAISession('u1', 'p1');
  await saveActiveAISession('u1', 'p1', [{ role: 'user', text: 'second' }]);
  const sessions = await loadAISessions('u1', 'p1');

  await deleteAISession('u1', 'p1', sessions[0].id);

  await expect(loadAISessions('u1', 'p1')).resolves.toEqual([
    expect.objectContaining({ title: 'first' }),
  ]);
});
