import { apiData } from './api';
import { DailyLog } from '../types';
const q = (u: string) => `userId=${encodeURIComponent(u)}`;
export const getDailyLogs = (u: string, p: string) =>
  apiData<{ records: DailyLog[] }>(`/api/pets/${p}/daily-logs?${q(u)}`);
export const getDailyLog = (u: string, id: string) =>
  apiData<{ record: DailyLog }>(`/api/daily-logs/${id}?${q(u)}`);
export const getTodayDailyLog = (
  u: string,
  p: string,
  date = new Date().toISOString().slice(0, 10),
) =>
  apiData<{ record: DailyLog | null }>(`/api/pets/${p}/daily-logs/today?${q(u)}&localDate=${date}`);
export const createDailyLog = (
  u: string,
  p: string,
  data: Omit<DailyLog, 'id' | 'petId' | 'createdAt' | 'updatedAt'>,
) =>
  apiData<{ record: DailyLog }>(`/api/pets/${p}/daily-logs?${q(u)}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const updateDailyLog = (u: string, id: string, data: Partial<DailyLog>) =>
  apiData<{ record: DailyLog }>(`/api/daily-logs/${id}?${q(u)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
export const deleteDailyLog = (u: string, id: string) =>
  apiData(`/api/daily-logs/${id}?${q(u)}`, { method: 'DELETE' });
