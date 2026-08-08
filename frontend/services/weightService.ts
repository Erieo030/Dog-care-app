/** 用途：封裝具使用者與毛孩範圍的體重列表、摘要及 CRUD API。 */
import { apiData } from './api';
import { WeightInput, WeightRecord, WeightSummary } from '../types';

export interface WeightListResult {
  records: WeightRecord[];
  summary: WeightSummary;
}

const userQuery = (userId: string) => `userId=${encodeURIComponent(userId)}`;

export const getWeights = async (userId: string, petId: string): Promise<WeightListResult> => {
  const result = await apiData<WeightListResult>(`/api/pets/${petId}/weights?${userQuery(userId)}`);
  return {
    records: [...result.records].sort(
      (left, right) => new Date(right.measuredAt).getTime() - new Date(left.measuredAt).getTime(),
    ),
    summary: result.summary,
  };
};

export const createWeight = async (userId: string, petId: string, data: WeightInput) =>
  (
    await apiData<{ record: WeightRecord }>(`/api/pets/${petId}/weights?${userQuery(userId)}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  ).record;

export const updateWeight = async (userId: string, id: string, data: WeightInput) =>
  (
    await apiData<{ record: WeightRecord }>(`/api/weights/${id}?${userQuery(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  ).record;

export const deleteWeight = (userId: string, id: string) =>
  apiData(`/api/weights/${id}?${userQuery(userId)}`, { method: 'DELETE' });
