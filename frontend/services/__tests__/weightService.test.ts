import { apiRequest } from '../api';
import { createWeight, deleteWeight, getWeights, updateWeight } from '../weightService';

jest.mock('../api', () => ({ apiRequest: jest.fn() }));
const request = apiRequest as jest.MockedFunction<typeof apiRequest>;
beforeEach(() => jest.clearAllMocks());

const record = (id: string, measuredAt: string) => ({
  id,
  petId: 'pet-1',
  weightKg: 8.4,
  measuredAt,
});

test('getWeights sorts records newest first', async () => {
  request.mockResolvedValueOnce({
    records: [record('old', '2026-01-01T00:00:00Z'), record('new', '2026-02-01T00:00:00Z')],
    summary: {
      latestWeightKg: 8.4,
      latestMeasuredAt: '2026-02-01T00:00:00Z',
      differenceKg: 0,
      change: 'unchanged',
    },
  });
  const result = await getWeights('user-1', 'pet-1');
  expect(result.records.map((item) => item.id)).toEqual(['new', 'old']);
});

test('weight mutations use the shared API contract', async () => {
  request.mockResolvedValue({ record: record('new', '2026-02-01T00:00:00Z') });
  await createWeight('user-1', 'pet-1', { weightKg: 8.4, measuredAt: '2026-02-01T00:00:00Z' });
  await updateWeight('user-1', 'new', { weightKg: 8.5, measuredAt: '2026-02-01T00:00:00Z' });
  await deleteWeight('user-1', 'new');
  expect(request).toHaveBeenCalledTimes(3);
  expect(request.mock.calls[0][0]).toContain('/api/pets/pet-1/weights?userId=user-1');
  expect(request.mock.calls[1][0]).toContain('/api/weights/new?userId=user-1');
  expect(request.mock.calls[2][1]).toMatchObject({ method: 'DELETE' });
});
