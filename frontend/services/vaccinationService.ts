import { apiData } from './api';
import { Vaccination } from '../types';
const q = (u: string) => `userId=${encodeURIComponent(u)}`;
export const getVaccinations = (u: string, p: string, signal?: AbortSignal) => {
  const path = `/api/pets/${p}/vaccinations?${q(u)}`;
  return signal
    ? apiData<{ records: Vaccination[] }>(path, { signal })
    : apiData<{ records: Vaccination[] }>(path);
};
export const getVaccination = (u: string, id: string, signal?: AbortSignal) => {
  const path = `/api/vaccinations/${id}?${q(u)}`;
  return signal
    ? apiData<{ record: Vaccination }>(path, { signal })
    : apiData<{ record: Vaccination }>(path);
};
export const createVaccination = (u: string, p: string, d: Partial<Vaccination>) =>
  apiData<{ record: Vaccination }>(`/api/pets/${p}/vaccinations?${q(u)}`, {
    method: 'POST',
    body: JSON.stringify(d),
  });
export const updateVaccination = (u: string, id: string, d: Partial<Vaccination>) =>
  apiData<{ record: Vaccination }>(`/api/vaccinations/${id}?${q(u)}`, {
    method: 'PATCH',
    body: JSON.stringify(d),
  });
export const deleteVaccination = (u: string, id: string) =>
  apiData(`/api/vaccinations/${id}?${q(u)}`, { method: 'DELETE' });
