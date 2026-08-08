import { apiData } from '../api';
import { createVaccination, getVaccinations } from '../vaccinationService';
import { createDeworming, updateDeworming } from '../dewormingService';
import { completeMedication, getMedications, stopMedication } from '../medicationService';

jest.mock('../api', () => ({ apiData: jest.fn() }));
const request = apiData as jest.MockedFunction<typeof apiData>;
beforeEach(() => jest.clearAllMocks());

test('vaccination service uses records endpoint and reminder fields', async () => {
  request.mockResolvedValueOnce({ records: [] });
  await getVaccinations('user@example.com', 'pet-1');
  expect(request).toHaveBeenCalledWith('/api/pets/pet-1/vaccinations?userId=user%40example.com');
  request.mockResolvedValueOnce({ record: { id: 'v1' } });
  await createVaccination('u1', 'p1', {
    vaccineName: '狂犬病',
    administeredAt: '2026-08-01',
    createReminder: true,
  });
  expect(request.mock.calls[1][1]).toMatchObject({ method: 'POST' });
});

test('deworming update preserves next due date payload', async () => {
  request.mockResolvedValueOnce({ record: { id: 'd1' } });
  await createDeworming('u1', 'p1', {
    type: 'heartworm',
    productName: '預防錠',
    administeredAt: '2026-08-01',
    nextDueAt: '2026-09-01',
    createReminder: true,
  });
  request.mockResolvedValueOnce({ record: { id: 'd1' } });
  await updateDeworming('u1', 'd1', {
    type: 'heartworm',
    productName: '預防錠',
    administeredAt: '2026-08-01',
    nextDueAt: '2026-09-05',
  });
  expect(request.mock.calls[1][1]).toMatchObject({
    method: 'PATCH',
    body: expect.stringContaining('2026-09-05'),
  });
});

test('medication service supports status filtering and lifecycle actions', async () => {
  request.mockResolvedValueOnce({ records: [] });
  await getMedications('u1', 'p1', 'active');
  expect(request).toHaveBeenCalledWith('/api/pets/p1/medications?userId=u1&status=active');
  request.mockResolvedValue({ record: { id: 'm1', status: 'completed' } });
  await completeMedication('u1', 'm1');
  await stopMedication('u1', 'm1');
  expect(request.mock.calls[1][1]).toMatchObject({ method: 'POST' });
  expect(request.mock.calls[2][0]).toContain('/api/medications/m1/stop');
});
