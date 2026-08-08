import { apiRequest } from './api';
import { DailyLog } from '../types';
const q = (u: string) => `userId=${encodeURIComponent(u)}`;
export const getDailyLogs = (u: string, p: string) =>
  apiRequest<{ records: DailyLog[] }>(`/api/pets/${p}/daily-logs?${q(u)}`);
export const getTodayDailyLog = (
  u: string,
  p: string,
  date = new Date().toISOString().slice(0, 10),
) =>
  apiRequest<{ record: DailyLog | null }>(
    `/api/pets/${p}/daily-logs/today?${q(u)}&localDate=${date}`,
  );
export const createDailyLog = (
  u: string,
  p: string,
  data: Omit<DailyLog, 'id' | 'petId' | 'createdAt' | 'updatedAt'>,
) =>
  apiRequest<{ record: DailyLog }>(`/api/pets/${p}/daily-logs?${q(u)}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const updateDailyLog = (u: string, id: string, data: Partial<DailyLog>) =>
  apiRequest<{ record: DailyLog }>(`/api/daily-logs/${id}?${q(u)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
export const deleteDailyLog = (u: string, id: string) =>
  apiRequest(`/api/daily-logs/${id}?${q(u)}`, { method: 'DELETE' });
