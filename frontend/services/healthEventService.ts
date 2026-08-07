/** 用途：封裝具使用者所有權檢查的健康異常紀錄 CRUD API。 */
import { apiRequest } from './api';
import { HealthEvent, HealthEventInput } from '../types';

const withUser = (path: string, userId: string) =>
  `${path}?userId=${encodeURIComponent(userId)}`;

export const getHealthEvents = async (userId: string, petId: string) =>
  (await apiRequest<{ events: HealthEvent[] }>(
    withUser(`/api/pets/${petId}/health-events`, userId)
  )).events;

export const getHealthEvent = async (userId: string, eventId: string) =>
  (await apiRequest<{ event: HealthEvent }>(
    withUser(`/api/health-events/${eventId}`, userId)
  )).event;

export const createHealthEvent = async (
  userId: string,
  petId: string,
  data: HealthEventInput
) => (await apiRequest<{ event: HealthEvent }>(
  withUser(`/api/pets/${petId}/health-events`, userId),
  { method: 'POST', body: JSON.stringify(data) }
)).event;

export const updateHealthEvent = async (
  userId: string,
  eventId: string,
  data: HealthEventInput
) => (await apiRequest<{ event: HealthEvent }>(
  withUser(`/api/health-events/${eventId}`, userId),
  { method: 'PATCH', body: JSON.stringify(data) }
)).event;

export const deleteHealthEvent = (userId: string, eventId: string) =>
  apiRequest(withUser(`/api/health-events/${eventId}`, userId), {
    method: 'DELETE',
  });

export const createVomitingHealthEvent = async (
  userId: string,
  petId: string,
  data: HealthEventInput
) => (await apiRequest<{ event: HealthEvent }>(
  withUser(`/api/pets/${petId}/vomiting-events`, userId),
  { method: 'POST', body: JSON.stringify(data) }
)).event;

export const updateVomitingHealthEvent = async (
  userId: string,
  eventId: string,
  data: HealthEventInput
) => (await apiRequest<{ event: HealthEvent }>(
  withUser(`/api/vomiting-events/${eventId}`, userId),
  { method: 'PATCH', body: JSON.stringify(data) }
)).event;

export const createStoolHealthEvent = async (
  userId: string,
  petId: string,
  data: HealthEventInput
) => (await apiRequest<{ event: HealthEvent }>(
  withUser(`/api/pets/${petId}/stool-events`, userId),
  { method: 'POST', body: JSON.stringify(data) }
)).event;

export const updateStoolHealthEvent = async (
  userId: string,
  eventId: string,
  data: HealthEventInput
) => (await apiRequest<{ event: HealthEvent }>(
  withUser(`/api/stool-events/${eventId}`, userId),
  { method: 'PATCH', body: JSON.stringify(data) }
)).event;

export const createObservationHealthEvent = async (userId: string, petId: string, data: HealthEventInput) =>
  (await apiRequest<{ event: HealthEvent }>(withUser(`/api/pets/${petId}/observation-events`, userId), { method: 'POST', body: JSON.stringify(data) })).event;

export const updateObservationHealthEvent = async (userId: string, eventId: string, data: HealthEventInput) =>
  (await apiRequest<{ event: HealthEvent }>(withUser(`/api/observation-events/${eventId}`, userId), { method: 'PATCH', body: JSON.stringify(data) })).event;
