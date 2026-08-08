import { apiRequest } from '../api';
import {
  completeReminder,
  createReminder,
  getTodayReminders,
  snoozeReminder,
} from '../reminderService';

jest.mock('../api', () => ({ apiRequest: jest.fn() }));
const request = apiRequest as jest.MockedFunction<typeof apiRequest>;
beforeEach(() => jest.clearAllMocks());

const reminder = {
  id: 'r1',
  petId: 'p1',
  type: 'vaccine',
  title: '疫苗',
  scheduledAt: '2026-09-01T09:00:00Z',
  recurrenceRule: 'none',
  status: 'pending',
};

test('today reminders uses pet and encoded user query', async () => {
  request.mockResolvedValueOnce({ reminders: [reminder] });
  const result = await getTodayReminders('user@example.com', 'pet-1');
  expect(result).toEqual([reminder]);
  expect(request).toHaveBeenCalledWith('/api/pets/pet-1/reminders/today?userId=user%40example.com');
});

test('reminder actions use explicit HTTP methods and payloads', async () => {
  request.mockResolvedValueOnce({ reminder });
  await createReminder('u1', 'p1', {
    type: 'vaccine',
    title: '疫苗',
    scheduledAt: reminder.scheduledAt,
    recurrenceRule: 'none',
    notes: '',
  });
  request.mockResolvedValueOnce({ reminder });
  await snoozeReminder('u1', 'r1', '2026-09-02T09:00:00Z');
  request.mockResolvedValueOnce({ reminder, changed: true, nextReminder: null });
  await completeReminder('u1', 'r1');
  expect(request.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  expect(request.mock.calls[1][1]).toMatchObject({
    method: 'POST',
    body: JSON.stringify({ scheduledAt: '2026-09-02T09:00:00Z' }),
  });
  expect(request.mock.calls[2][1]).toMatchObject({ method: 'POST' });
});
