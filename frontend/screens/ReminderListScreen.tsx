/** 用途：顯示毛孩提醒，提供編輯、完成、略過、延後、刪除與通知同步。 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { Colors } from '../constants/Colors';
import { tonightAt } from '../constants/Reminders';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { useSettings } from '../contexts/SettingsContext';
import { HomeStackParamList } from '../navigation/types';
import {
  cancelReminderNotifications,
  reconcileAccountNotifications,
  replaceReminderNotification,
} from '../services/notificationService';
import * as service from '../services/reminderService';
import { Reminder } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ReminderList'>;
const STATUS_LABEL: Record<Reminder['status'], string> = {
  pending: '待完成',
  snoozed: '已延後',
  completed: '已完成',
  skipped: '已略過',
};

export default function ReminderListScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { pets, selectedPet } = usePet();
  const { settings } = useSettings();
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [customSnoozeId, setCustomSnoozeId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedPet || !session?.userId) return;
    setError('');
    try {
      setItems(await service.getReminders(session.userId, selectedPet.id));
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPet, session?.userId]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const reconcile = async () => {
    if (!session?.userId) return;
    try {
      await reconcileAccountNotifications(session.userId, pets);
    } catch {
      Alert.alert('通知同步失敗', '提醒資料已更新，手機通知將在下次開啟 App 時再次同步。');
    }
  };

  const run = async (id: string, task: () => Promise<unknown>) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await task();
      await reconcile();
      await load();
    } catch (requestError) {
      Alert.alert('操作失敗', (requestError as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const complete = (id: string) =>
    run(id, async () => {
      await service.completeReminder(session!.userId, id);
      await cancelReminderNotifications(id).catch(() => undefined);
    });

  const skip = (item: Reminder) =>
    Alert.alert('略過提醒', `略過「${item.title}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '略過',
        onPress: () =>
          run(item.id, async () => {
            await service.skipReminder(session!.userId, item.id);
            await cancelReminderNotifications(item.id).catch(() => undefined);
          }),
      },
    ]);

  const snooze = (item: Reminder) =>
    Alert.alert('延後提醒', item.title, [
      { text: '取消', style: 'cancel' },
      { text: '1 小時後', onPress: () => runSnooze(item, new Date(Date.now() + 3600000)) },
      { text: '今晚', onPress: () => runSnooze(item, tonightAt(new Date(), settings.tonightTime)) },
      { text: '明天', onPress: () => runSnooze(item, new Date(Date.now() + 86400000)) },
      { text: '自訂時間', onPress: () => setCustomSnoozeId(item.id) },
    ]);

  const runSnooze = (item: Reminder, date: Date) =>
    run(item.id, async () => {
      const updated = await service.snoozeReminder(session!.userId, item.id, date.toISOString());
      await replaceReminderNotification(session!.userId, updated, selectedPet!.name).catch(
        () => undefined,
      );
    });

  const remove = (item: Reminder) =>
    Alert.alert('刪除提醒', `確定刪除「${item.title}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: () =>
          run(item.id, async () => {
            await cancelReminderNotifications(item.id).catch(() => undefined);
            await service.deleteReminder(session!.userId, item.id);
          }),
      },
    ]);

  const customItem = items.find((item) => item.id === customSnoozeId);
  if (loading) return <Center text="載入提醒中…" loading />;
  if (error) return <Center text={error} action={load} />;
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
              reconcile();
            }}
          />
        }
      >
        {customItem && (
          <DateTimePicker
            value={new Date()}
            mode="datetime"
            minimumDate={new Date()}
            onChange={(_, date) => {
              if (Platform.OS !== 'ios' || date) setCustomSnoozeId(null);
              if (date) runSnooze(customItem, date);
            }}
          />
        )}
        <TouchableOpacity
          style={styles.primary}
          onPress={() => navigation.navigate('CreateReminder')}
        >
          <Text style={styles.primaryText}>＋ 新增提醒</Text>
        </TouchableOpacity>
        {route.params?.focusReminderId &&
          !items.some((item) => item.id === route.params?.focusReminderId) && (
            <Text style={styles.sourceMissing}>來源提醒可能已刪除或不屬於目前毛孩。</Text>
          )}
        {!items.length ? (
          <Center text="尚未建立提醒" />
        ) : (
          items.map((item) => {
            const active = item.status === 'pending' || item.status === 'snoozed';
            return (
              <View
                key={item.id}
                style={[styles.card, route.params?.focusReminderId === item.id && styles.focusCard]}
              >
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>
                  {new Date(item.scheduledAt).toLocaleString('zh-TW')} · {STATUS_LABEL[item.status]}
                </Text>
                {!!item.notes && <Text style={styles.notes}>{item.notes}</Text>}
                <View style={styles.row}>
                  {active && (
                    <>
                      {item.sourceType !== 'medical_visit' && (
                        <Action
                          label="編輯"
                          disabled={busyId !== null}
                          onPress={() => navigation.navigate('CreateReminder', { reminder: item })}
                        />
                      )}
                      <Action
                        label="完成"
                        disabled={busyId !== null}
                        onPress={() => complete(item.id)}
                      />
                      <Action
                        label="延後"
                        disabled={busyId !== null}
                        onPress={() => snooze(item)}
                      />
                      <Action label="略過" disabled={busyId !== null} onPress={() => skip(item)} />
                    </>
                  )}
                  <Action
                    label={busyId === item.id ? '處理中…' : '刪除'}
                    disabled={busyId !== null}
                    danger
                    onPress={() => remove(item)}
                  />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Action({
  label,
  onPress,
  danger = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      style={[styles.action, disabled && styles.disabled]}
      onPress={onPress}
    >
      <Text style={[styles.actionText, danger && styles.danger]}>{label}</Text>
    </TouchableOpacity>
  );
}
function Center({
  text,
  loading,
  action,
}: {
  text: string;
  loading?: boolean;
  action?: () => void;
}) {
  return (
    <View style={styles.center}>
      {loading && <ActivityIndicator color={Colors.primary} />}
      <Text style={styles.empty}>{text}</Text>
      {action && (
        <TouchableOpacity style={styles.primary} onPress={action}>
          <Text style={styles.primaryText}>重試</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  empty: { color: Colors.subtext, textAlign: 'center', marginTop: 10 },
  primary: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryText: { color: '#FFF', fontWeight: '800' },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  focusCard: { borderColor: Colors.primary, borderWidth: 2 },
  sourceMissing: { color: '#C55B5B', textAlign: 'center', marginBottom: 12 },
  title: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  meta: { color: Colors.subtext, marginTop: 5 },
  notes: { color: Colors.text, marginTop: 9 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  action: {
    minHeight: 42,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
  },
  actionText: { color: Colors.text, fontWeight: '700' },
  danger: { color: '#B34A42' },
  disabled: { opacity: 0.5 },
});
