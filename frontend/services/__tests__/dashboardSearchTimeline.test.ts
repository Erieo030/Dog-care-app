import { apiData } from '../api';
import { getHealthDashboard } from '../dashboardService';
import { searchRecords } from '../searchService';
import { getTimelinePage, getRecentTimeline } from '../timelineService';
import { SearchResultType } from '../../types';

jest.mock('../api', () => ({ apiData: jest.fn() }));
const request = apiData as jest.MockedFunction<typeof apiData>;
beforeEach(() => jest.clearAllMocks());

const filters = {
  query: '嘔吐',
  startAt: undefined,
  endAt: undefined,
  types: ['health_event'] as SearchResultType[],
  healthCategories: [],
  clinic: '',
  veterinarian: '',
  attachment: 'any' as const,
  reminderStatus: 'any' as const,
  sort: 'newest' as const,
};

test('dashboard passes requested range and pet scope', async () => {
  request.mockResolvedValueOnce({ data: { pet: { id: 'p1' } } });
  await getHealthDashboard('u1', 'p1', 7);
  expect(request.mock.calls[0][0]).toContain('/api/pets/p1/dashboard?');
  expect(request.mock.calls[0][0]).toContain('range=7');
  expect(request.mock.calls[0][0]).toContain('userId=u1');
});

test('search encodes filters and pagination', async () => {
  request.mockResolvedValueOnce({
    data: { items: [], page: 2, pageSize: 10, total: 0, hasMore: false },
  });
  await searchRecords('user@example.com', 'p1', filters, 2, 10);
  const path = request.mock.calls[0][0];
  expect(path).toContain('/api/pets/p1/search?');
  expect(path).toContain('query=%E5%98%94%E5%90%90');
  expect(path).toContain('page=2');
  expect(path).toContain('pageSize=10');
});

test('timeline supports type filters and recent limit', async () => {
  request.mockResolvedValueOnce({ items: [], hasMore: true, nextSkip: 20 });
  await getTimelinePage('u1', 'p1', { limit: 20, skip: 0, type: 'health_event' });
  expect(request.mock.calls[0][0]).toContain('type=health_event');
  request.mockResolvedValueOnce({ items: [{ id: 't1' }], hasMore: false, nextSkip: 1 });
  await expect(getRecentTimeline('u1', 'p1', 1)).resolves.toEqual([{ id: 't1' }]);
  expect(request.mock.calls[1][0]).toContain('limit=1');
});
