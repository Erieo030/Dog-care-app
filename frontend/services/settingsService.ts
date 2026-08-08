/** 用途：持久化非敏感 App 偏好；不保存帳密或秘密。 */
import AsyncStorage from '@react-native-async-storage/async-storage';
export interface AppSettings {
  localNotificationsEnabled: boolean;
  defaultReminderTime: string;
  tonightTime: string;
}
export const DEFAULT_SETTINGS: AppSettings = {
  localNotificationsEnabled: true,
  defaultReminderTime: '09:00',
  tonightTime: '20:00',
};
const KEY = 'pawlog.app-settings.v1';
const validTime = (value: unknown) =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export async function loadSettings(): Promise<AppSettings> {
  try {
    const value = JSON.parse((await AsyncStorage.getItem(KEY)) || '{}');
    return {
      ...DEFAULT_SETTINGS,
      localNotificationsEnabled:
        typeof value.localNotificationsEnabled === 'boolean'
          ? value.localNotificationsEnabled
          : true,
      defaultReminderTime: validTime(value.defaultReminderTime)
        ? value.defaultReminderTime
        : DEFAULT_SETTINGS.defaultReminderTime,
      tonightTime: validTime(value.tonightTime) ? value.tonightTime : DEFAULT_SETTINGS.tonightTime,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
export async function saveSettings(value: AppSettings) {
  await AsyncStorage.setItem(KEY, JSON.stringify(value));
}
export async function resetSettings() {
  await AsyncStorage.removeItem(KEY);
  return DEFAULT_SETTINGS;
}
export async function localNotificationsEnabled() {
  return (await loadSettings()).localNotificationsEnabled;
}
export function timeOnDate(value: string, base = new Date()) {
  const [hour, minute] = value.split(':').map(Number);
  const result = new Date(base);
  result.setHours(hour, minute, 0, 0);
  return result;
}
