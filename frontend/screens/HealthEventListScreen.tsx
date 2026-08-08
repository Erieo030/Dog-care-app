/** 用途：列出目前毛孩的健康異常紀錄，並連結至詳細頁。 */
import React, { useCallback, useRef, useState } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '../constants/Colors';
import ScreenState from '../components/ScreenState';
import { HEALTH_EVENT_LABELS, SEVERITY_LABELS } from '../constants/HealthEvents';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import type { HomeStackParamList } from '../navigation/types';
import * as service from '../services/healthEventService';
import { HealthEvent } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'HealthEventList'>;

export default function HealthEventListScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [items, setItems] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setItems([]);
    if (!session?.userId || !selectedPet) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError('');
      const result = await service.getHealthEvents(session.userId, selectedPet.id);
      if (currentRequest !== requestId.current) return;
      setItems(result);
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
      setLoading(true);
      load();
    }, [load]),
  );

  if (loading) return <ScreenState loading text="載入中…" />;
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
            }}
          />
        }
      >
        {!!error && (
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
        )}
        {!error && !items.length && <Text style={styles.empty}>尚無健康異常紀錄</Text>}
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => navigation.navigate('HealthEventDetail', { eventId: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{HEALTH_EVENT_LABELS[item.type]}</Text>
              <Text style={[styles.badge, item.severity === 'severe' && styles.severe]}>
                {SEVERITY_LABELS[item.severity]}
              </Text>
            </View>
            <Text style={styles.date}>{new Date(item.occurredAt).toLocaleString('zh-TW')}</Text>
            <Text style={styles.summary}>{item.summary}</Text>
            {!!item.notes && (
              <Text numberOfLines={2} style={styles.notes}>
                {item.notes}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 50 },
  center: { flex: 1, justifyContent: 'center', backgroundColor: Colors.background },
  state: { alignItems: 'center', padding: 30 },
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
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 17,
    marginBottom: 11,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', flexShrink: 1 },
  badge: {
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 12,
  },
  severe: { color: '#C34D4D' },
  date: { color: Colors.subtext, fontSize: 12, marginTop: 7 },
  summary: { color: Colors.text, marginTop: 9, lineHeight: 21 },
  notes: { color: Colors.subtext, marginTop: 6, lineHeight: 20 },
});
