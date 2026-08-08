import { apiRequest } from './api';
import { Deworming } from '../types';
const q = (u: string) => `userId=${encodeURIComponent(u)}`;
export const getDewormings = (u: string, p: string) =>
  apiRequest<{ records: Deworming[] }>(`/api/pets/${p}/dewormings?${q(u)}`);
export const getDeworming = (u: string, id: string) =>
  apiRequest<{ record: Deworming }>(`/api/dewormings/${id}?${q(u)}`);
export const createDeworming = (u: string, p: string, d: Partial<Deworming>) =>
  apiRequest<{ record: Deworming }>(`/api/pets/${p}/dewormings?${q(u)}`, {
    method: 'POST',
    body: JSON.stringify(d),
  });
export const updateDeworming = (u: string, id: string, d: Partial<Deworming>) =>
  apiRequest<{ record: Deworming }>(`/api/dewormings/${id}?${q(u)}`, {
    method: 'PATCH',
    body: JSON.stringify(d),
  });
export const deleteDeworming = (u: string, id: string) =>
  apiRequest(`/api/dewormings/${id}?${q(u)}`, { method: 'DELETE' });
