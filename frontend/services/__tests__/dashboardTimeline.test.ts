import { apiData } from '../api';
import { getHealthDashboard } from '../dashboardService';
import { getTimelinePage, getRecentTimeline } from '../timelineService';

jest.mock('../api', () => ({ apiData: jest.fn() }));
const request = apiData as jest.MockedFunction<typeof apiData>;
beforeEach(() => jest.clearAllMocks());

test('dashboard passes requested range and pet scope', async () => {
  request.mockResolvedValueOnce({ data: { pet: { id: 'p1' } } });
  await getHealthDashboard('u1', 'p1', 7);
  expect(request.mock.calls[0][0]).toContain('/api/pets/p1/dashboard?');
  expect(request.mock.calls[0][0]).toContain('range=7');
  expect(request.mock.calls[0][0]).toContain('userId=u1');
});

test('dashboard forwards an optional cancellation signal', async () => {
  const controller = new AbortController();
  request.mockResolvedValueOnce({ data: { pet: { id: 'p1' } } });
  await getHealthDashboard('u1', 'p1', 30, controller.signal);
  expect(request.mock.calls[0][1]).toEqual({ signal: controller.signal });
});

test('timeline supports type filters and recent limit', async () => {
  request.mockResolvedValueOnce({ items: [], hasMore: true, nextSkip: 20 });
  await getTimelinePage('u1', 'p1', { limit: 20, skip: 0, type: 'health_event' });
  expect(request.mock.calls[0][0]).toContain('type=health_event');
  request.mockResolvedValueOnce({ items: [{ id: 't1' }], hasMore: false, nextSkip: 1 });
  await expect(getRecentTimeline('u1', 'p1', 1)).resolves.toEqual([{ id: 't1' }]);
  expect(request.mock.calls[1][0]).toContain('limit=1');
});

test('timeline supports a calendar month date range', async () => {
  request.mockResolvedValueOnce({ items: [], hasMore: false, nextSkip: 0 });
  await getTimelinePage('u1', 'p1', {
    startAt: '2026-08-31T16:00:00.000Z',
    endAt: '2026-09-30T16:00:00.000Z',
  });
  expect(request.mock.calls[0][0]).toContain('startAt=2026-08-31T16%3A00%3A00.000Z');
  expect(request.mock.calls[0][0]).toContain('endAt=2026-09-30T16%3A00%3A00.000Z');
});

test('timeline forwards an optional cancellation signal', async () => {
  const controller = new AbortController();
  request.mockResolvedValueOnce({ items: [], hasMore: false, nextSkip: 0 });
  await getTimelinePage('u1', 'p1', { signal: controller.signal });
  expect(request.mock.calls[0][1]).toEqual({ signal: controller.signal });
});
