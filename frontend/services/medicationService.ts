import { apiData } from './api';
import { MedicationCourse } from '../types';
const q = (u: string) => `userId=${encodeURIComponent(u)}`;
export const getMedications = (u: string, p: string, status?: string) =>
  apiData<{ records: MedicationCourse[] }>(
    `/api/pets/${p}/medications?${q(u)}${status ? `&status=${status}` : ''}`,
  );
export const getMedication = (u: string, id: string) =>
  apiData<{ record: MedicationCourse }>(`/api/medications/${id}?${q(u)}`);
export const createMedication = (u: string, p: string, d: Partial<MedicationCourse>) =>
  apiData<{ record: MedicationCourse }>(`/api/pets/${p}/medications?${q(u)}`, {
    method: 'POST',
    body: JSON.stringify(d),
  });
export const updateMedication = (u: string, id: string, d: Partial<MedicationCourse>) =>
  apiData<{ record: MedicationCourse }>(`/api/medications/${id}?${q(u)}`, {
    method: 'PATCH',
    body: JSON.stringify(d),
  });
export const completeMedication = (u: string, id: string) =>
  apiData<{ record: MedicationCourse }>(`/api/medications/${id}/complete?${q(u)}`, {
    method: 'POST',
  });
export const stopMedication = (u: string, id: string) =>
  apiData<{ record: MedicationCourse }>(`/api/medications/${id}/stop?${q(u)}`, {
    method: 'POST',
  });
export const deleteMedication = (u: string, id: string) =>
  apiData(`/api/medications/${id}?${q(u)}`, { method: 'DELETE' });
