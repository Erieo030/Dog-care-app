import { apiRequest } from '../api';
import {
  createVomitingHealthEvent,
  deleteHealthEvent,
  getHealthEvent,
  updateHealthEvent,
} from '../healthEventService';

jest.mock('../api', () => ({ apiRequest: jest.fn() }));
const request = apiRequest as jest.MockedFunction<typeof apiRequest>;
beforeEach(() => jest.clearAllMocks());

const event = {
  id: 'e1',
  petId: 'p1',
  type: 'vomiting',
  occurredAt: '2026-08-01T10:00:00Z',
  severity: 'mild',
  summary: '嘔吐 1 次',
  details: { vomitCount: 'once', energyCondition: 'normal' },
};

test('health detail query returns event data', async () => {
  request.mockResolvedValueOnce({ event });
  await expect(getHealthEvent('user@example.com', 'e1')).resolves.toEqual(event);
  expect(request).toHaveBeenCalledWith('/api/health-events/e1?userId=user%40example.com');
});

test('vomiting flow preserves specialized details and update/delete methods', async () => {
  request.mockResolvedValueOnce({ event });
  await createVomitingHealthEvent('u1', 'p1', {
    type: 'vomiting',
    occurredAt: event.occurredAt,
    severity: 'mild',
    summary: event.summary,
    details: event.details,
  });
  request.mockResolvedValueOnce({ event });
  await updateHealthEvent('u1', 'e1', {
    type: 'vomiting',
    occurredAt: event.occurredAt,
    severity: 'moderate',
    summary: '已編輯',
    details: event.details,
  });
  request.mockResolvedValueOnce(undefined);
  await deleteHealthEvent('u1', 'e1');
  expect(request.mock.calls[0][1]).toMatchObject({
    method: 'POST',
    body: expect.stringContaining('vomitCount'),
  });
  expect(request.mock.calls[1][1]).toMatchObject({ method: 'PATCH' });
  expect(request.mock.calls[2][1]).toMatchObject({ method: 'DELETE' });
});
