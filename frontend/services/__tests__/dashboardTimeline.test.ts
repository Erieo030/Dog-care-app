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

test('timeline supports type filters and recent limit', async () => {
  request.mockResolvedValueOnce({ items: [], hasMore: true, nextSkip: 20 });
  await getTimelinePage('u1', 'p1', { limit: 20, skip: 0, type: 'health_event' });
  expect(request.mock.calls[0][0]).toContain('type=health_event');
  request.mockResolvedValueOnce({ items: [{ id: 't1' }], hasMore: false, nextSkip: 1 });
  await expect(getRecentTimeline('u1', 'p1', 1)).resolves.toEqual([{ id: 't1' }]);
  expect(request.mock.calls[1][0]).toContain('limit=1');
});
