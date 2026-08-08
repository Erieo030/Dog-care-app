import { apiData } from '../api';
import {
  createMedicalVisit,
  deleteMedicalVisit,
  getMedicalVisits,
  updateMedicalVisit,
} from '../medicalVisitService';

jest.mock('../api', () => ({ apiData: jest.fn() }));
const request = apiData as jest.MockedFunction<typeof apiData>;
beforeEach(() => jest.clearAllMocks());

const visit = {
  id: 'v1',
  petId: 'p1',
  visitedAt: '2026-08-01T09:00:00Z',
  reason: '年度檢查',
  clinicName: '幸福動物醫院',
};
const input = {
  visitedAt: visit.visitedAt,
  reason: visit.reason,
  clinicName: visit.clinicName,
  medications: [],
  createFollowUpReminder: true,
  followUpAt: '2026-09-01T09:00:00Z',
};

test('medical visit list returns backend visits', async () => {
  request.mockResolvedValueOnce({ visits: [visit] });
  await expect(getMedicalVisits('user@example.com', 'p1')).resolves.toEqual([visit]);
  expect(request).toHaveBeenCalledWith('/api/pets/p1/medical-visits?userId=user%40example.com');
});

test('medical visit CRUD preserves follow-up reminder fields', async () => {
  request.mockResolvedValueOnce({ visit });
  await createMedicalVisit('u1', 'p1', input);
  request.mockResolvedValueOnce({ visit });
  await updateMedicalVisit('u1', 'v1', input);
  request.mockResolvedValueOnce(undefined);
  await deleteMedicalVisit('u1', 'v1');
  expect(request.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(input) });
  expect(request.mock.calls[1][1]).toMatchObject({ method: 'PATCH' });
  expect(request.mock.calls[2][1]).toMatchObject({ method: 'DELETE' });
});
