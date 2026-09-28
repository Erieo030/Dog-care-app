/** 用途：以月曆瀏覽每日照護紀錄，並可進入各筆來源明細。 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../constants/Colors';
import ScreenState from '../components/ScreenState';
import { openTimelineSource } from '../constants/Timeline';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import { getTimelinePage } from '../services/timelineService';
import { TimelineItem } from '../types';
import {
  getItemsForLocalDate,
  getLocalDateKey,
  getMonthRange,
  getTimelineCategoriesForDay,
  TIMELINE_PAGE_SIZE,
  TimelineCategory,
} from '../features/timeline/timelineContent';
import TimelineCard from '../features/timeline/components/TimelineCard';
import TimelineHeader from '../features/timeline/components/TimelineHeader';
import { TimelineEmptyState } from '../features/timeline/components/TimelineStates';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';

type Props = NativeStackScreenProps<HomeStackParamList, 'TimelineOverview'>;

export default function TimelineScreen({ navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const lastPetId = useRef<string | null>(null);

  const load = useCallback(
    async (showLoader = false, signal?: AbortSignal) => {
      const current = ++requestId.current;
      if (!selectedPet || !session?.userId) {
        setItems([]);
        setLoading(false);
        return;
      }
      const petChanged = lastPetId.current !== selectedPet.id;
      lastPetId.current = selectedPet.id;
      try {
        setError('');
        if (showLoader || petChanged) setLoading(true);
        const range = getMonthRange(month);
        const monthItems: TimelineItem[] = [];
        let skip = 0;
        let hasMore = true;
        while (hasMore) {
          const page = await getTimelinePage(session.userId, selectedPet.id, {
            limit: TIMELINE_PAGE_SIZE,
            skip,
            ...range,
            signal,
          });
          if (current !== requestId.current) return;
          monthItems.push(...page.items);
          skip = page.nextSkip;
          hasMore = page.hasMore;
        }
        setItems(monthItems);
      } catch (requestError) {
        if (current !== requestId.current) return;
        setError((requestError as Error).message || '無法載入這個月的紀錄');
        setItems([]);
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    },
    [month, selectedPet, session?.userId],
  );

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void load(false, controller.signal);
      return () => {
        controller.abort();
        requestId.current += 1;
      };
    }, [load]),
  );

  const selectedItems = useMemo(
    () => getItemsForLocalDate(items, selectedDate),
    [items, selectedDate],
  );
  const markedDays = useMemo(() => {
    const itemsByDay: Record<string, TimelineItem[]> = {};
    items.forEach((item) => {
      const key = getLocalDateKey(new Date(item.occurredAt));
      if (!itemsByDay[key]) itemsByDay[key] = [];
      itemsByDay[key].push(item);
    });
    const categoriesByDay: Record<string, TimelineCategory[]> = {};
    Object.entries(itemsByDay).forEach(([key, dayItems]) => {
      categoriesByDay[key] = getTimelineCategoriesForDay(dayItems);
    });
    return categoriesByDay;
  }, [items]);

  const selectMonth = (nextMonth: Date) => {
    const monthStart = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    if (monthStart.getTime() !== month.getTime()) {
      setItems([]);
      setLoading(true);
    }
    setMonth(monthStart);
    setSelectedDate((currentDate) => {
      const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
      return new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        Math.min(currentDate.getDate(), lastDay),
      );
    });
  };
  const selectDate = (date: Date) => {
    if (date.getFullYear() !== month.getFullYear() || date.getMonth() !== month.getMonth()) {
      setItems([]);
      setLoading(true);
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    setSelectedDate(date);
  };
  const goToday = () => {
    const today = new Date();
    const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    if (todayMonth.getTime() !== month.getTime()) {
      setItems([]);
      setLoading(true);
    }
    setMonth(todayMonth);
    setSelectedDate(today);
  };
  const refresh = () => {
    setRefreshing(true);
    load(false).finally(() => setRefreshing(false));
  };

  if (loading) return <ScreenState loading text="正在載入照護紀錄…" />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={error ? [] : selectedItems}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <>
            <TimelineHeader
              petName={selectedPet?.name}
              avatarUrl={selectedPet?.avatarUrl}
              month={month}
              selectedDate={selectedDate}
              markedDays={markedDays}
              itemCount={selectedItems.length}
              onSelectDate={selectDate}
              onSelectMonth={selectMonth}
              onGoToday={goToday}
            />
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.error}>{error}</Text>
                <TouchableOpacity style={styles.retry} onPress={() => load(true)}>
                  <Text style={styles.retryText}>重新載入</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        ListEmptyComponent={!error ? <TimelineEmptyState /> : null}
        renderItem={({ item }) => (
          <TimelineCard item={item} onPress={() => openTimelineSource(navigation, item)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 18, paddingTop: 18, flexGrow: 1 },
  errorBox: { alignItems: 'center', paddingVertical: 20 },
  error: { color: Colors.danger, textAlign: 'center' },
  retry: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
  },
  retryText: { color: Colors.primary, fontWeight: '800' },
});
