/** 用途：顯示全量體重摘要、期間篩選、折線趨勢與可管理的歷史紀錄。 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  LayoutChangeEvent,
  RefreshControl,
  SafeAreaView,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '../constants/Colors';
import ScreenState from '../components/ScreenState';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import * as service from '../services/weightService';
import { WeightRecord, WeightSummary } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'WeightList'>;
type Period = 7 | 'all';

const EMPTY_SUMMARY: WeightSummary = {
  latestWeightKg: null,
  latestMeasuredAt: null,
  differenceKg: null,
  change: null,
};

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 7, label: '最近 7 天' },
  { value: 'all', label: '全部' },
];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

const filterByPeriod = (items: WeightRecord[], period: Period) => {
  if (period === 'all') return items;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (period - 1));
  return items.filter((item) => new Date(item.measuredAt) >= cutoff);
};

const getDifferenceText = (summary: WeightSummary) => {
  if (summary.latestWeightKg == null) return null;
  if (summary.differenceKg == null) return '尚無前一次體重可比較';
  if (summary.change === 'unchanged') return '與前一次相比無變化';
  const direction = summary.change === 'increased' ? '增加' : '減少';
  return `比前一次${direction} ${Math.abs(summary.differenceKg)
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1')} kg`;
};

export default function WeightListScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { selectedPet, refreshPets } = usePet();
  const [items, setItems] = useState<WeightRecord[]>([]);
  const [summary, setSummary] = useState<WeightSummary>(EMPTY_SUMMARY);
  const [period, setPeriod] = useState<Period>(route.params?.focusRecordId ? 'all' : 7);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!selectedPet || !session?.userId) {
      setItems([]);
      setSummary(EMPTY_SUMMARY);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError('');
      const result = await service.getWeights(session.userId, selectedPet.id);
      setItems(result.records);
      setSummary(result.summary);
    } catch (requestError) {
      setError((requestError as Error).message || '無法載入體重紀錄');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPet, session?.userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const filteredItems = useMemo(() => filterByPeriod(items, period), [items, period]);

  const refresh = () => {
    setRefreshing(true);
    load();
  };

  const remove = (item: WeightRecord) =>
    Alert.alert('刪除體重紀錄', `確定刪除 ${item.weightKg} kg？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          if (!session?.userId || deletingId) return;
          setDeletingId(item.id);
          try {
            await service.deleteWeight(session.userId, item.id);
            await Promise.all([load(), refreshPets()]);
          } catch (requestError) {
            Alert.alert('刪除失敗', (requestError as Error).message);
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);

  if (loading) return <ScreenState loading text="正在載入體重紀錄…" />;

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.stateTitle}>載入失敗</Text>
        <Text style={styles.stateText}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>重試</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={<>
          <TouchableOpacity style={styles.primary} onPress={() => navigation.navigate('WeightForm', {})}>
            <Text style={styles.primaryText}>＋ 更新體重</Text>
          </TouchableOpacity>
          <WeightSummaryCard summary={summary} />
          <Text style={styles.heading}>查看期間</Text>
          <View style={styles.filters}>
            {PERIODS.map((option) => (
              <TouchableOpacity key={String(option.value)} style={[styles.filter, period === option.value && styles.filterActive]} onPress={() => setPeriod(option.value)}>
                <Text style={[styles.filterText, period === option.value && styles.filterTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.heading}>體重趨勢</Text>
          <WeightLineChart items={filteredItems} />
          <Text style={styles.heading}>歷史紀錄</Text>
          {route.params?.focusRecordId && !items.some((item) => item.id === route.params?.focusRecordId) && (
            <Text style={styles.sourceMissing}>來源體重紀錄可能已刪除或不屬於目前毛孩。</Text>
          )}
          {!items.length ? (
            <View style={styles.emptyBox}><Ionicons name="scale-outline" size={34} color={Colors.primary} /><Text style={styles.empty}>尚未記錄體重</Text><Text style={styles.emptyHint}>偶爾記一次，就能慢慢看見變化。</Text></View>
          ) : !filteredItems.length ? <Text style={styles.empty}>此期間沒有體重紀錄</Text> : null}
        </>}
        renderItem={({ item }) => (
          <View style={[styles.card, route.params?.focusRecordId === item.id && styles.focusCard]}>
            <View style={styles.recordContent}>
              <Text style={styles.weight}>{item.weightKg} kg</Text>
              <Text style={styles.date}>{formatDate(item.measuredAt)}</Text>
              <Text style={styles.notes}>{item.notes?.trim() || '無備註'}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`編輯體重 ${item.weightKg} 公斤`} onPress={() => navigation.navigate('WeightForm', { record: item })} disabled={Boolean(deletingId)}>
                <Text style={styles.link}>編輯</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`刪除體重 ${item.weightKg} 公斤`} onPress={() => remove(item)} disabled={Boolean(deletingId)}>
                <Text style={styles.delete}>{deletingId === item.id ? '刪除中…' : '刪除'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function WeightSummaryCard({ summary }: { summary: WeightSummary }) {
  const differenceText = getDifferenceText(summary);
  return (
    <View style={styles.summary}>
      <Text style={styles.caption}>最新體重</Text>
      <Text style={styles.current}>
        {summary.latestWeightKg == null ? '尚未記錄體重' : `${summary.latestWeightKg} kg`}
      </Text>
      {summary.latestMeasuredAt && (
        <Text style={styles.measuredAt}>最近測量日期：{formatDate(summary.latestMeasuredAt)}</Text>
      )}
      {differenceText && (
        <Text
          style={[
            styles.diff,
            summary.change === 'increased' && styles.increased,
            summary.change === 'decreased' && styles.decreased,
          ]}
        >
          {differenceText}
        </Text>
      )}
    </View>
  );
}

function WeightLineChart({ items }: { items: WeightRecord[] }) {
  const [width, setWidth] = useState(0);
  const chronological = useMemo(
    () =>
      [...items].sort(
        (left, right) => new Date(left.measuredAt).getTime() - new Date(right.measuredAt).getTime(),
      ),
    [items],
  );

  if (!chronological.length) {
    return <Text style={styles.empty}>此期間沒有資料可繪製趨勢</Text>;
  }
  if (chronological.length === 1) {
    return <Text style={styles.empty}>至少需要兩筆資料才能顯示趨勢</Text>;
  }

  const weights = chronological.map((item) => item.weightKg);
  const rawMin = Math.min(...weights);
  const rawMax = Math.max(...weights);
  const padding = rawMax === rawMin ? Math.max(rawMax * 0.05, 0.5) : (rawMax - rawMin) * 0.15;
  const min = Math.max(0, rawMin - padding);
  const max = rawMax + padding;
  const plotLeft = 45;
  const plotTop = 8;
  const plotHeight = 145;
  const plotWidth = Math.max(width - plotLeft - 12, 1);
  const points = chronological.map((item, index) => ({
    x: plotLeft + (index / (chronological.length - 1)) * plotWidth,
    y: plotTop + ((max - item.weightKg) / (max - min || 1)) * plotHeight,
    item,
  }));

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View style={styles.chartCard} onLayout={onLayout}>
      <View style={styles.chartCanvas}>
        <Text style={[styles.axisLabel, { top: 0 }]}>{max.toFixed(1)} kg</Text>
        <Text style={[styles.axisLabel, { top: plotHeight - 4 }]}>{min.toFixed(1)} kg</Text>
        <View style={[styles.axisLine, { left: plotLeft, top: plotTop, height: plotHeight }]} />
        <View
          style={[
            styles.horizontalAxis,
            { left: plotLeft, top: plotTop + plotHeight, width: plotWidth },
          ]}
        />
        {width > 0 &&
          points.slice(0, -1).map((point, index) => {
            const next = points[index + 1];
            const deltaX = next.x - point.x;
            const deltaY = next.y - point.y;
            const length = Math.sqrt(deltaX ** 2 + deltaY ** 2);
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
            return (
              <View
                key={`${point.item.id}-${next.item.id}`}
                style={[
                  styles.chartLine,
                  {
                    width: length,
                    left: (point.x + next.x - length) / 2,
                    top: (point.y + next.y) / 2,
                    transform: [{ rotate: `${angle}deg` }],
                  },
                ]}
              />
            );
          })}
        {width > 0 &&
          points.map((point) => (
            <View
              key={point.item.id}
              style={[styles.chartPoint, { left: point.x - 4, top: point.y - 4 }]}
            />
          ))}
      </View>
      <View style={styles.xLabels}>
        <Text style={styles.xLabel}>{formatDate(chronological[0].measuredAt)}</Text>
        <Text style={[styles.xLabel, styles.xLabelRight]}>
          {formatDate(chronological[chronological.length - 1].measuredAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 50 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 28,
  },
  stateTitle: { color: Colors.text, fontSize: 21, fontWeight: '800' },
  stateText: { color: Colors.subtext, textAlign: 'center', marginTop: 8 },
  retry: {
    backgroundColor: Colors.primary,
    borderRadius: 13,
    paddingHorizontal: 22,
    paddingVertical: 11,
    marginTop: 18,
  },
  retryText: { color: '#FFF', fontWeight: '800' },
  primary: {
    backgroundColor: Colors.primary,
    padding: 14,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFF', fontWeight: '800' },
  summary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
  },
  caption: { color: Colors.subtext },
  current: { color: Colors.text, fontSize: 30, fontWeight: '800', marginTop: 4 },
  measuredAt: { color: Colors.subtext, marginTop: 6 },
  diff: { color: Colors.text, fontWeight: '700', marginTop: 9 },
  increased: { color: '#B56A3B' },
  decreased: { color: '#4F8A6D' },
  heading: { color: Colors.text, fontSize: 20, fontWeight: '800', marginTop: 22, marginBottom: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 44,
  },
  filterActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  filterText: { color: Colors.text, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#FFF' },
  chartCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 12,
  },
  chartCanvas: { height: 165, position: 'relative' },
  axisLabel: { position: 'absolute', left: 0, width: 42, color: Colors.subtext, fontSize: 10 },
  axisLine: { position: 'absolute', width: 1, backgroundColor: Colors.border },
  horizontalAxis: { position: 'absolute', height: 1, backgroundColor: Colors.border },
  chartLine: { position: 'absolute', height: 2, borderRadius: 1, backgroundColor: Colors.primary },
  chartPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.text,
  },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 42, marginTop: 3 },
  xLabel: { color: Colors.subtext, fontSize: 10, maxWidth: '48%' },
  xLabelRight: { textAlign: 'right' },
  emptyBox: { alignItems: 'center', paddingVertical: 28 },
  emptyIcon: { fontSize: 34, marginBottom: 8 },
  emptyHint: { color: '#887A6D', fontSize: 13, marginTop: 6, textAlign: 'center' },
  empty: {
    color: Colors.subtext,
    textAlign: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 25,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  focusCard: { borderColor: Colors.primary, borderWidth: 2 },
  sourceMissing: { color: '#C55B5B', textAlign: 'center', marginVertical: 10 },
  recordContent: { flex: 1, paddingRight: 12 },
  weight: { color: Colors.text, fontSize: 19, fontWeight: '800' },
  date: { color: Colors.subtext, marginTop: 3 },
  notes: { color: Colors.text, marginTop: 7 },
  actions: { gap: 12, alignItems: 'flex-end' },
  link: { color: Colors.primary, fontWeight: '700' },
  delete: { color: '#E57373', fontWeight: '700' },
});
