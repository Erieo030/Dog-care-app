/** 用途：封裝具使用者 ownership 的提醒 CRUD、完成、略過與延後 API。 */
import { apiRequest } from './api';
import { Reminder, ReminderActionResult, ReminderInput, ReminderUpdateInput } from '../types';

const withUser = (path: string, userId: string) =>
  `${path}${path.includes('?') ? '&' : '?'}userId=${encodeURIComponent(userId)}`;

export const getReminders = async (userId: string, petId: string) =>
  (await apiRequest<{ reminders: Reminder[] }>(withUser(`/api/pets/${petId}/reminders`, userId)))
    .reminders;
export const getTodayReminders = async (userId: string, petId: string) =>
  (
    await apiRequest<{ reminders: Reminder[] }>(
      withUser(`/api/pets/${petId}/reminders/today`, userId),
    )
  ).reminders;
export const createReminder = async (userId: string, petId: string, data: ReminderInput) =>
  (
    await apiRequest<{ reminder: Reminder }>(withUser(`/api/pets/${petId}/reminders`, userId), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  ).reminder;
export const updateReminder = async (userId: string, id: string, data: ReminderUpdateInput) =>
  (
    await apiRequest<{ reminder: Reminder }>(withUser(`/api/reminders/${id}`, userId), {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  ).reminder;
export const completeReminder = (userId: string, id: string) =>
  apiRequest<ReminderActionResult>(withUser(`/api/reminders/${id}/complete`, userId), {
    method: 'POST',
  });
export const skipReminder = (userId: string, id: string) =>
  apiRequest<ReminderActionResult>(withUser(`/api/reminders/${id}/skip`, userId), {
    method: 'POST',
  });
export const snoozeReminder = async (userId: string, id: string, scheduledAt: string) =>
  (
    await apiRequest<{ reminder: Reminder }>(withUser(`/api/reminders/${id}/snooze`, userId), {
      method: 'POST',
      body: JSON.stringify({ scheduledAt }),
    })
  ).reminder;
export const deleteReminder = (userId: string, id: string) =>
  apiRequest(withUser(`/api/reminders/${id}`, userId), { method: 'DELETE' });
