/** 用途：顯示毛孩提醒，提供編輯、完成、略過、延後、刪除與通知同步。 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, SafeAreaView, FlatList, StyleSheet, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { Colors } from '../constants/Colors';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import DatePickerField from '../components/DatePickerField';
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
import {
  getVisibleReminders,
  groupReminderEntries,
  REMINDER_ARTWORKS,
} from '../features/reminders/reminderListContent';
import ReminderListCard from '../features/reminders/components/ReminderListCard';
import ReminderListHeader from '../features/reminders/components/ReminderListHeader';
import {
  ReminderListLoadingState,
  default as ReminderListState,
} from '../features/reminders/components/ReminderListState';

type Props = NativeStackScreenProps<HomeStackParamList, 'ReminderList'>;

export default function ReminderListScreen({ navigation, route }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { pets, selectedPet } = usePet();
  const { settings } = useSettings();
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [customSnoozeId, setCustomSnoozeId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const current = ++requestId.current;
    if (!selectedPet || !session?.userId) return;
    setError('');
    try {
      const reminders = await service.getReminders(session.userId, selectedPet.id, signal);
      if (current === requestId.current) setItems(reminders);
    } catch (requestError) {
      if (current === requestId.current && !signal?.aborted)
        setError((requestError as Error).message);
    } finally {
      if (current === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedPet, session?.userId]);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void load(controller.signal);
      return () => {
        controller.abort();
        requestId.current += 1;
      };
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

  const upcomingDays = route.params?.upcomingDays;
  const visibleItems = useMemo(
    () => getVisibleReminders(items, upcomingDays),
    [items, upcomingDays],
  );
  const listEntries = useMemo(() => groupReminderEntries(visibleItems), [visibleItems]);
  const customItem = items.find((item) => item.id === customSnoozeId);
  if (loading) return <ReminderListLoadingState />;
  if (error) return <ReminderListState text={error} onAction={load} />;
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={listEntries}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
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
        ListHeaderComponent={
          <>
            {customItem && (
              <DatePickerField
                label="自訂延後時間"
                mode="datetime"
                minimumDate={new Date()}
                onChange={(date) => {
                  const item = customItem;
                  setCustomSnoozeId(null);
                  runSnooze(item, date);
                }}
              />
            )}
            <ReminderListHeader
              upcomingDays={upcomingDays}
              count={visibleItems.length}
              showMissingSource={Boolean(
                route.params?.focusReminderId &&
                  !items.some((item) => item.id === route.params?.focusReminderId),
              )}
              onCreate={() => navigation.navigate('CreateReminder')}
            />
          </>
        }
        ListEmptyComponent={
          <ReminderListState text="尚未建立提醒" artwork={REMINDER_ARTWORKS[settings.homeTheme]} />
        }
        renderItem={({ item: entry }) => {
          if (entry.kind === 'heading')
            return <Text style={styles.sectionHeading}>{entry.title}</Text>;
          const item = entry.item;
          return (
            <ReminderListCard
              item={item}
              focused={route.params?.focusReminderId === item.id}
              busyId={busyId}
              onEdit={() => navigation.navigate('CreateReminder', { reminder: item })}
              onComplete={() => complete(item.id)}
              onSnooze={() => snooze(item)}
              onSkip={() => skip(item)}
              onRemove={() => remove(item)}
            />
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 34 },
  sectionHeading: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
  },
});
