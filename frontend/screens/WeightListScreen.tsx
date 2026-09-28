/** 用途：顯示全量體重摘要、期間篩選、折線趨勢與可管理的歷史紀錄。 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '../constants/Colors';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import ScreenState from '../components/ScreenState';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import * as service from '../services/weightService';
import { WeightRecord, WeightSummary } from '../types';
import {
  EMPTY_WEIGHT_SUMMARY,
  filterWeightsByPeriod,
  formatWeightDate,
  WEIGHT_PERIODS,
  WeightPeriod,
} from '../features/weights/weightListContent';
import { WeightLineChart } from '../features/weights/components/WeightLineChart';
import { WeightSummaryCard } from '../features/weights/components/WeightSummaryCard';
import { weightListStyles as styles } from '../features/weights/weightListStyles';

type Props = NativeStackScreenProps<HomeStackParamList, 'WeightList'>;

export default function WeightListScreen({ navigation, route }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet, refreshPets } = usePet();
  const [items, setItems] = useState<WeightRecord[]>([]);
  const [summary, setSummary] = useState<WeightSummary>(EMPTY_WEIGHT_SUMMARY);
  const [period, setPeriod] = useState<WeightPeriod>(route.params?.focusRecordId ? 'all' : 7);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const current = ++requestId.current;
    if (!selectedPet || !session?.userId) {
      setItems([]);
      setSummary(EMPTY_WEIGHT_SUMMARY);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError('');
      const result = await service.getWeights(session.userId, selectedPet.id, signal);
      if (current !== requestId.current) return;
      setItems(result.records);
      setSummary(result.summary);
    } catch (requestError) {
      if (current === requestId.current && !signal?.aborted)
        setError((requestError as Error).message || '無法載入體重紀錄');
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
      setLoading(true);
      void load(controller.signal);
      return () => {
        controller.abort();
        requestId.current += 1;
      };
    }, [load]),
  );

  const filteredItems = useMemo(() => filterWeightsByPeriod(items, period), [items, period]);

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
        <TouchableOpacity style={styles.retry} onPress={() => void load()}>
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
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <>
            <AppButton
              variant="primary"
              style={styles.primary}
              onPress={() => navigation.navigate('WeightForm', {})}
              accessibilityLabel="更新體重"
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.primaryText}>更新體重</Text>
            </AppButton>
            <View style={styles.listContext}>
              <View style={styles.contextIcon}>
                <Ionicons name="scale-outline" size={18} color={Colors.success} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.contextTitle}>用固定頻率記錄，就能看見變化</Text>
                <Text style={styles.contextHint}>選擇期間查看趨勢與歷史資料</Text>
              </View>
            </View>
            <WeightSummaryCard summary={summary} />
            <Text style={styles.heading}>查看期間</Text>
            <View style={styles.filters}>
              {WEIGHT_PERIODS.map((option) => (
                <TouchableOpacity
                  key={String(option.value)}
                  style={[styles.filter, period === option.value && styles.filterActive]}
                  onPress={() => setPeriod(option.value)}
                >
                  <Text
                    style={[styles.filterText, period === option.value && styles.filterTextActive]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.heading}>體重趨勢</Text>
            <WeightLineChart items={filteredItems} />
            <Text style={styles.heading}>歷史紀錄</Text>
            {route.params?.focusRecordId &&
              !items.some((item) => item.id === route.params?.focusRecordId) && (
                <Text style={styles.sourceMissing}>來源體重紀錄可能已刪除或不屬於目前毛孩。</Text>
              )}
            {!items.length ? (
              <View style={styles.emptyBox}>
                <Ionicons name="scale-outline" size={34} color={Colors.primary} />
                <Text style={styles.empty}>尚未記錄體重</Text>
                <Text style={styles.emptyHint}>偶爾記一次，就能慢慢看見變化。</Text>
              </View>
            ) : !filteredItems.length ? (
              <Text style={styles.empty}>此期間沒有體重紀錄</Text>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, route.params?.focusRecordId === item.id && styles.focusCard]}>
            <View style={styles.recordContent}>
              <Text style={styles.weight}>{item.weightKg} kg</Text>
              <Text style={styles.date}>{formatWeightDate(item.measuredAt)}</Text>
              <Text style={styles.notes}>{item.notes?.trim() || '無補充備註'}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.rowAction}
                accessibilityRole="button"
                accessibilityLabel={`編輯體重 ${item.weightKg} 公斤`}
                onPress={() => navigation.navigate('WeightForm', { record: item })}
                disabled={Boolean(deletingId)}
              >
                <Text style={styles.link}>編輯</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rowAction}
                accessibilityRole="button"
                accessibilityLabel={`刪除體重 ${item.weightKg} 公斤`}
                onPress={() => remove(item)}
                disabled={Boolean(deletingId)}
              >
                <Text style={styles.delete}>{deletingId === item.id ? '刪除中…' : '刪除'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
