/** 用途：取得單一毛孩首頁健康儀表板聚合資料。 */
import { apiData } from './api';
import { HealthDashboard } from '../types';
export const getHealthDashboard = async (
  userId: string,
  petId: string,
  range = 30,
  signal?: AbortSignal,
) => {
  const query = new URLSearchParams({
    userId,
    timezoneOffsetMinutes: String(new Date().getTimezoneOffset()),
  });
  const path = `/api/pets/${petId}/dashboard?${query.toString()}&range=${range}&_=${Date.now()}`;
  return signal
    ? apiData<HealthDashboard>(path, { signal })
    : apiData<HealthDashboard>(path);
};
