/** 用途：取得單一毛孩首頁健康儀表板聚合資料。 */
import { apiRequest } from './api';
import { HealthDashboard } from '../types';
export const getHealthDashboard = async (userId: string, petId: string, range = 30) => {
  const query = new URLSearchParams({
    userId,
    timezoneOffsetMinutes: String(new Date().getTimezoneOffset()),
  });
  return (
    await apiRequest<{ success: boolean; message: string; data: HealthDashboard }>(
      `/api/pets/${petId}/dashboard?${query.toString()}&range=${range}`,
    )
  ).data;
};
