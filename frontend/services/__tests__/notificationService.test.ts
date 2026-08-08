import * as Notifications from 'expo-notifications';
import { getReminders } from '../reminderService';
import { localNotificationsEnabled } from '../settingsService';
import { Reminder, Pet } from '../../types';
import {
  getNotificationPermissionState,
  scheduleReminderNotification,
  reconcileAccountNotifications,
} from '../notificationService';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-notifications', () => ({
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  clearLastNotificationResponseAsync: jest.fn(),
}));
jest.mock('../settingsService', () => ({ localNotificationsEnabled: jest.fn() }));
jest.mock('../reminderService', () => ({ getReminders: jest.fn() }));
const notifications = Notifications as jest.Mocked<typeof Notifications>;
const enabled = localNotificationsEnabled as jest.MockedFunction<typeof localNotificationsEnabled>;
const reminders = getReminders as jest.MockedFunction<typeof getReminders>;
beforeEach(() => jest.clearAllMocks());

const reminder = {
  id: 'r1',
  petId: 'p1',
  type: 'vaccine',
  title: '疫苗',
  scheduledAt: '2099-09-01T09:00:00Z',
  recurrenceRule: 'none',
  status: 'pending',
} as unknown as Reminder;

test('permission state distinguishes granted, denied and undetermined', async () => {
  notifications.getPermissionsAsync.mockResolvedValueOnce({
    granted: true,
    status: 'granted',
  } as unknown as Notifications.NotificationPermissionsStatus);
  await expect(getNotificationPermissionState()).resolves.toBe('granted');
  notifications.getPermissionsAsync.mockResolvedValueOnce({
    granted: false,
    status: 'denied',
  } as unknown as Notifications.NotificationPermissionsStatus);
  await expect(getNotificationPermissionState()).resolves.toBe('denied');
  notifications.getPermissionsAsync.mockResolvedValueOnce({
    granted: false,
    status: 'undetermined',
  } as unknown as Notifications.NotificationPermissionsStatus);
  await expect(getNotificationPermissionState()).resolves.toBe('undetermined');
});

test('expired or disabled reminders do not schedule notifications', async () => {
  enabled.mockResolvedValueOnce(false);
  await expect(scheduleReminderNotification('u1', reminder, 'Kuro', false)).resolves.toEqual({
    status: 'disabled',
  });
  enabled.mockResolvedValueOnce(true);
  await expect(
    scheduleReminderNotification(
      'u1',
      { ...reminder, scheduledAt: '2020-01-01T00:00:00Z' },
      'Kuro',
      false,
    ),
  ).resolves.toEqual({ status: 'expired' });
  expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('reconciliation schedules future reminders for every pet', async () => {
  enabled.mockResolvedValue(true);
  notifications.getPermissionsAsync.mockResolvedValue({
    granted: true,
    status: 'granted',
  } as unknown as Notifications.NotificationPermissionsStatus);
  notifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  notifications.scheduleNotificationAsync.mockResolvedValue('notification-1');
  reminders.mockImplementation(async (_u, pet) => (pet === 'p1' ? [reminder] : []));
  const result = await reconcileAccountNotifications('u1', [
    { id: 'p1', name: 'Kuro' } as Pet,
    { id: 'p2', name: 'Mochi' } as Pet,
  ]);
  expect(result.scheduled).toBe(1);
  expect(notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
    expect.objectContaining({
      content: expect.objectContaining({ body: expect.stringContaining('Kuro') }),
    }),
  );
});
