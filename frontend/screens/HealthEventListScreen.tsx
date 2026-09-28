/** 用途：列出目前毛孩的健康異常紀錄，並連結至詳細頁。 */
import React, { useCallback, useRef, useState } from 'react';
import {
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '../constants/Colors';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import ScreenState from '../components/ScreenState';
import { HEALTH_EVENT_LABELS, SEVERITY_LABELS } from '../constants/HealthEvents';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import type { HomeStackParamList } from '../navigation/types';
import * as service from '../services/healthEventService';
import { HealthEvent } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'HealthEventList'>;

export default function HealthEventListScreen({ navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [items, setItems] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const currentRequest = ++requestId.current;
    setItems([]);
    if (!session?.userId || !selectedPet) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError('');
      const result = await service.getHealthEvents(session.userId, selectedPet.id, signal);
      if (currentRequest !== requestId.current) return;
      const cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
      cutoff.setDate(cutoff.getDate() - 6);
      setItems(
        result
          .filter((item) => new Date(item.occurredAt).getTime() >= cutoff.getTime())
          .sort(
            (left, right) =>
              new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
          ),
      );
    } catch (requestError) {
      if (currentRequest !== requestId.current) return;
      setError((requestError as Error).message || '無法載入健康紀錄');
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [session?.userId, selectedPet]);

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

  if (loading) return <ScreenState loading text="載入中…" />;
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={error ? [] : items}
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
            }}
          />
        }
        ListHeaderComponent={
          error ? (
            <View style={styles.state}>
              <Text style={styles.error}>{error}</Text>
              <TouchableOpacity
                style={styles.retry}
                onPress={() => {
                  setLoading(true);
                  load();
                }}
              >
                <Text style={styles.retryText}>重新載入</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.listContext}>
              <View style={styles.contextIcon}>
                <Ionicons name="heart-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.contextTitle}>最近 7 天的健康觀察</Text>
                <Text style={styles.contextHint}>方便回看已記錄的狀況</Text>
              </View>
              <Text style={styles.count}>{items.length} 筆</Text>
            </View>
          )
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Ionicons name="leaf-outline" size={30} color={Colors.primary} />
              </View>
              <Text style={styles.empty}>尚無健康異常紀錄</Text>
              <Text style={styles.emptyHint}>有需要時再記下來，方便之後回想。</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            accessibilityRole="button"
            accessibilityLabel={`查看健康異常：${HEALTH_EVENT_LABELS[item.type]}`}
            onPress={() => navigation.navigate('HealthEventDetail', { eventId: item.id })}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.eventIcon}>
                <Ionicons name="pulse-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    {HEALTH_EVENT_LABELS[item.type]}
                  </Text>
                  <Text style={[styles.badge, item.severity === 'severe' && styles.severe]}>
                    {SEVERITY_LABELS[item.severity]}
                  </Text>
                </View>
                <Text style={styles.date}>
                  {new Date(item.occurredAt).toLocaleDateString('zh-TW', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}
                </Text>
              </View>
            </View>
            <Text numberOfLines={2} style={styles.summary}>
              {item.summary}
            </Text>
            {!!item.notes && (
              <Text numberOfLines={2} style={styles.notes}>
                {item.notes}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 34 },
  flex: { flex: 1, minWidth: 0 },
  center: { flex: 1, justifyContent: 'center', backgroundColor: Colors.background },
  state: { alignItems: 'center', padding: 30 },
  emptyBox: { alignItems: 'center', paddingVertical: 28 },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
    marginBottom: 8,
  },
  emptyHint: { color: '#887A6D', fontSize: 13, marginTop: 6, textAlign: 'center' },
  empty: { color: Colors.subtext, textAlign: 'center', padding: 40 },
  error: { color: '#C55B5B', textAlign: 'center' },
  retry: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryText: { color: Colors.text, fontWeight: '700' },
  listContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  contextIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  contextTitle: { color: Colors.text, fontSize: 16, fontWeight: '800' },
  contextHint: { color: Colors.subtext, fontSize: 12, marginTop: 2 },
  count: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 11,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1, minWidth: 0 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: { color: Colors.text, fontSize: 17, fontWeight: '800', flexShrink: 1 },
  badge: {
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 12,
  },
  severe: { color: '#C34D4D' },
  date: { color: Colors.subtext, fontSize: 12, marginTop: 4 },
  summary: { color: Colors.text, marginTop: 9, lineHeight: 21 },
  notes: { color: Colors.subtext, marginTop: 6, lineHeight: 20 },
});
