/** 用途：集中管理 PawLog 本機通知權限、排程、取消、重排與帳號層級 reconciliation。 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { Pet, Reminder } from '../types';
import { getReminders } from './reminderService';
import { localNotificationsEnabled } from './settingsService';

const CHANNEL_ID = 'pawlog-reminders';
const OWNER_KEY = 'pawlog-local-reminder';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';
export type ScheduleResult =
  | { status: 'scheduled'; identifier: string }
  | { status: 'denied' | 'expired' | 'disabled' };
export type NotificationTarget = { userId: string; reminderId: string; petId: string };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const isGranted = (settings: Notifications.NotificationPermissionsStatus) =>
  settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '照護提醒',
    description: 'MEGO 毛孩照護與回診提醒',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const settings = await Notifications.getPermissionsAsync();
  if (isGranted(settings)) return 'granted';
  return settings.status === 'undetermined' ? 'undetermined' : 'denied';
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (isGranted(current)) return 'granted';
  if (current.status !== 'undetermined') return 'denied';
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return isGranted(requested) ? 'granted' : 'denied';
}

const dataOf = (request: Notifications.NotificationRequest) => request.content.data ?? {};
const isPawLog = (request: Notifications.NotificationRequest) =>
  dataOf(request).owner === OWNER_KEY;
const isForUser = (request: Notifications.NotificationRequest, userId: string) =>
  isPawLog(request) && dataOf(request).userId === userId;
const isForReminder = (request: Notifications.NotificationRequest, reminderId: string) =>
  isPawLog(request) && dataOf(request).reminderId === reminderId;

export async function getPawLogScheduledNotifications(userId?: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter((item) => (userId ? isForUser(item, userId) : isPawLog(item)));
}

export async function scheduleReminderNotification(
  userId: string,
  reminder: Reminder,
  petName: string,
  requestPermission = true,
): Promise<ScheduleResult> {
  if (!(await localNotificationsEnabled())) return { status: 'disabled' };
  const date = new Date(reminder.scheduledAt);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now())
    return { status: 'expired' };
  const permission = requestPermission
    ? await requestNotificationPermission()
    : await getNotificationPermissionState();
  if (permission !== 'granted') return { status: 'denied' };
  await ensureAndroidChannel();
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'MEGO 提醒 🐾',
      body:
        reminder.type === 'follow_up'
          ? `${petName} 今天需要回診`
          : `${petName} 的${reminder.title}時間到了`,
      sound: 'default',
      data: {
        owner: OWNER_KEY,
        userId,
        reminderId: reminder.id,
        petId: reminder.petId,
        scheduledAt: reminder.scheduledAt,
        reminderTitle: reminder.title,
        petName,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
    },
  });
  return { status: 'scheduled', identifier };
}

export async function cancelReminderNotifications(reminderId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => isForReminder(item, reminderId))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function replaceReminderNotification(
  userId: string,
  reminder: Reminder,
  petName: string,
) {
  await cancelReminderNotifications(reminder.id);
  return scheduleReminderNotification(userId, reminder, petName);
}

export async function cancelAccountNotifications(userId: string) {
  const scheduled = await getPawLogScheduledNotifications(userId);
  await Promise.all(
    scheduled.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function reconcileAccountNotifications(userId: string, pets: Pet[]) {
  if (!(await localNotificationsEnabled())) {
    const scheduled = await getPawLogScheduledNotifications(userId);
    await Promise.all(
      scheduled.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
    );
    return { scheduled: 0, cancelled: scheduled.length, permission: 'undetermined' as const };
  }
  if (!pets.length) return { scheduled: 0, cancelled: 0, permission: 'undetermined' as const };
  const remindersByPet = await Promise.all(
    pets.map(async (pet) => ({ pet, reminders: await getReminders(userId, pet.id) })),
  );
  const desired = remindersByPet.flatMap(({ pet, reminders }) =>
    reminders
      .filter(
        (item) =>
          ['pending', 'snoozed'].includes(item.status) &&
          new Date(item.scheduledAt).getTime() > Date.now(),
      )
      .map((reminder) => ({ reminder, petName: pet.name })),
  );
  const desiredIds = new Set(desired.map(({ reminder }) => reminder.id));
  const scheduled = await getPawLogScheduledNotifications(userId);
  let cancelled = 0;
  let created = 0;

  for (const request of scheduled) {
    const data = dataOf(request);
    const reminderId = typeof data.reminderId === 'string' ? data.reminderId : '';
    if (!desiredIds.has(reminderId)) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
      cancelled += 1;
    }
  }

  const permission = desired.length
    ? await requestNotificationPermission()
    : await getNotificationPermissionState();
  if (permission !== 'granted') return { scheduled: 0, cancelled, permission };

  for (const { reminder, petName } of desired) {
    const current = (await getPawLogScheduledNotifications(userId)).filter((item) =>
      isForReminder(item, reminder.id),
    );
    const exact = current.filter((item) => {
      const data = dataOf(item);
      return (
        data.scheduledAt === reminder.scheduledAt &&
        data.reminderTitle === reminder.title &&
        data.petName === petName
      );
    });
    const stale = exact.length
      ? current.filter((item) => item.identifier !== exact[0].identifier)
      : current;
    await Promise.all(
      stale.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
    );
    cancelled += stale.length;
    if (!exact.length) {
      const result = await scheduleReminderNotification(userId, reminder, petName, false);
      if (result.status === 'scheduled') created += 1;
    }
  }
  return { scheduled: created, cancelled, permission };
}

export function subscribeToNotificationResponses(handler: (target: NotificationTarget) => void) {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const data = response?.notification.request.content.data;
    if (!data || data.owner !== OWNER_KEY) return;
    if (
      typeof data.userId === 'string' &&
      typeof data.reminderId === 'string' &&
      typeof data.petId === 'string'
    ) {
      handler({ userId: data.userId, reminderId: data.reminderId, petId: data.petId });
      Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    }
  };
  Notifications.getLastNotificationResponseAsync()
    .then(handle)
    .catch(() => undefined);
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
