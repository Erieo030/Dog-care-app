import { apiRequest } from './api';
import { Vaccination } from '../types';
const q = (u: string) => `userId=${encodeURIComponent(u)}`;
export const getVaccinations = (u: string, p: string) =>
  apiRequest<{ records: Vaccination[] }>(`/api/pets/${p}/vaccinations?${q(u)}`);
export const getVaccination = (u: string, id: string) =>
  apiRequest<{ record: Vaccination }>(`/api/vaccinations/${id}?${q(u)}`);
export const createVaccination = (u: string, p: string, d: Partial<Vaccination>) =>
  apiRequest<{ record: Vaccination }>(`/api/pets/${p}/vaccinations?${q(u)}`, {
    method: 'POST',
    body: JSON.stringify(d),
  });
export const updateVaccination = (u: string, id: string, d: Partial<Vaccination>) =>
  apiRequest<{ record: Vaccination }>(`/api/vaccinations/${id}?${q(u)}`, {
    method: 'PATCH',
    body: JSON.stringify(d),
  });
export const deleteVaccination = (u: string, id: string) =>
  apiRequest(`/api/vaccinations/${id}?${q(u)}`, { method: 'DELETE' });
