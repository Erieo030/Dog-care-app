/** 封裝所有毛孩管理 API，畫面不直接組合 URL 或 fetch 選項。 */
import { requestJson } from '../api/client';

export const listPets = (userId) =>
  requestJson(`/api/pets/${userId}`);

export const createPet = (userId, petData) =>
  requestJson('/api/create-pet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...petData }),
  });

export const updatePet = (userId, petId, petData) =>
  requestJson(`/api/pets/${petId}?userId=${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(petData),
  });

export const deletePet = (userId, petId) =>
  requestJson(`/api/pets/${petId}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
