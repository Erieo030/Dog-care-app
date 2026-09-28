/** 用途：封裝具使用者 ownership 的就醫紀錄 CRUD API。 */
import { apiData } from './api';
import { MedicalVisit, MedicalVisitInput } from '../types';
const withUser = (path: string, userId: string) => `${path}?userId=${encodeURIComponent(userId)}`;
export const getMedicalVisits = async (userId: string, petId: string, signal?: AbortSignal) => {
  const path = withUser(`/api/pets/${petId}/medical-visits`, userId);
  const result = signal
    ? await apiData<{ visits: MedicalVisit[] }>(path, { signal })
    : await apiData<{ visits: MedicalVisit[] }>(path);
  return result.visits;
};
export const getMedicalVisit = async (userId: string, id: string, signal?: AbortSignal) => {
  const path = withUser(`/api/medical-visits/${id}`, userId);
  const result = signal
    ? await apiData<{ visit: MedicalVisit }>(path, { signal })
    : await apiData<{ visit: MedicalVisit }>(path);
  return result.visit;
};
export const createMedicalVisit = async (userId: string, petId: string, data: MedicalVisitInput) =>
  (
    await apiData<{ visit: MedicalVisit }>(withUser(`/api/pets/${petId}/medical-visits`, userId), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  ).visit;
export const updateMedicalVisit = async (userId: string, id: string, data: MedicalVisitInput) =>
  (
    await apiData<{ visit: MedicalVisit }>(withUser(`/api/medical-visits/${id}`, userId), {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  ).visit;
export const deleteMedicalVisit = (userId: string, id: string) =>
  apiData(withUser(`/api/medical-visits/${id}`, userId), { method: 'DELETE' });
