/** 用途：顯示健康異常紀錄完整內容，並提供編輯及確認刪除操作。 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/Colors';
import { AppButton } from '../components/AppButton';
import AttachmentGallery from '../components/AttachmentGallery';
import { HEALTH_EVENT_LABELS, SEVERITY_LABELS } from '../constants/HealthEvents';
import { normalizeVomitingDetails, vomitingDetailRows } from '../constants/Vomiting';
import { normalizeStoolDetails, stoolDetailRows } from '../constants/Stool';
import {
  isObservationType,
  normalizeObservationDetails,
  observationDetailRows,
} from '../constants/ObservationHealthEvents';
import { useAuth } from '../contexts/AuthContext';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import * as service from '../services/healthEventService';
import { HealthEvent } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'HealthEventDetail'>;

export default function HealthEventDetailScreen({ route, navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [item, setItem] = useState<HealthEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const currentRequest = ++requestId.current;
    setItem(null);
    if (!session?.userId || !selectedPet) {
      setError('找不到目前選取的毛孩');
      setLoading(false);
      return;
    }
    try {
      setError('');
      const result = await service.getHealthEvent(session.userId, route.params.eventId, signal);
      if (currentRequest !== requestId.current) return;
      if (result.petId !== selectedPet.id) {
        setError('此紀錄不屬於目前選取的毛孩');
        return;
      }
      setItem(result);
    } catch (requestError) {
      if (currentRequest !== requestId.current) return;
      setError((requestError as Error).message || '無法載入健康紀錄');
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [route.params.eventId, selectedPet, session?.userId]);

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

  const remove = () => {
    if (!item || !session?.userId || submitting) return;
    Alert.alert('刪除健康異常紀錄', `確定刪除「${item.summary}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          try {
            await service.deleteHealthEvent(session.userId, item.id);
            navigation.goBack();
          } catch (requestError) {
            Alert.alert('刪除失敗', (requestError as Error).message);
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  if (error || !item)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || '找不到健康紀錄'}</Text>
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
    );

  const detailRows =
    item.type === 'vomiting'
      ? vomitingDetailRows(normalizeVomitingDetails(item.details ?? {}))
      : item.type === 'abnormal_stool'
        ? stoolDetailRows(normalizeStoolDetails(item.details ?? {}))
        : isObservationType(item.type)
          ? observationDetailRows(
              item.type,
              normalizeObservationDetails(item.type, item.details ?? {}),
            )
          : Object.entries(item.details ?? {}).map(
              ([label, value]) => [label, String(value)] as [string, string],
            );
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="heart-outline" size={23} color={Colors.primary} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroType}>{HEALTH_EVENT_LABELS[item.type]}</Text>
            <Text numberOfLines={2} style={styles.heroSummary}>
              {item.summary}
            </Text>
            <Text style={styles.heroDate}>
              {new Date(item.occurredAt).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <Text style={[styles.severity, item.severity === 'severe' && styles.severitySevere]}>
            {SEVERITY_LABELS[item.severity]}
          </Text>
        </View>
        <View style={styles.actions}>
          <AppButton
            title="編輯紀錄"
            variant="primary"
            fullWidth={false}
            disabled={submitting}
            style={styles.edit}
            onPress={() => {
              if (item.type === 'vomiting')
                navigation.navigate('VomitingHealthEvent', { eventId: item.id });
              else if (item.type === 'abnormal_stool')
                navigation.navigate('StoolHealthEvent', { eventId: item.id });
              else if (isObservationType(item.type))
                navigation.navigate('ObservationHealthEvent', {
                  eventId: item.id,
                  type: item.type,
                });
              else navigation.navigate('HealthEventEdit', { eventId: item.id });
            }}
          />
          <AppButton
            title={submitting ? '刪除中…' : '刪除'}
            variant="danger"
            fullWidth={false}
            disabled={submitting}
            style={styles.delete}
            onPress={remove}
          />
        </View>
        <Text style={styles.heading}>這次紀錄</Text>
        <View style={styles.detailGroup}>
          <Row label="異常類型" value={HEALTH_EVENT_LABELS[item.type]} />
          <Row label="摘要" value={item.summary} />
          <Row
            label="發生時間"
            value={new Date(item.occurredAt).toLocaleString('zh-TW', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
          <Row label="嚴重程度" value={SEVERITY_LABELS[item.severity]} />
          {!!item.notes && <Row label="補充備註" value={item.notes} />}
        </View>
        {!!detailRows.length && (
          <>
            <Text style={styles.heading}>補充資訊</Text>
            <View style={styles.detailGroup}>
              {detailRows.map(([label, value]) => (
                <Row key={label} label={label} value={String(value)} />
              ))}
            </View>
          </>
        )}
        <>
          <Text style={styles.heading}>照片</Text>
          <View style={styles.detailGroup}>
            <AttachmentGallery items={item.attachments ?? []} userId={session!.userId} />
          </View>
        </>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 34 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  heroCopy: { flex: 1, minWidth: 0 },
  heroType: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
  heroSummary: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
    marginTop: 2,
  },
  heroDate: { color: Colors.subtext, fontSize: 12, marginTop: 5 },
  severity: {
    color: Colors.primary,
    backgroundColor: Colors.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '800',
  },
  severitySevere: { color: Colors.danger, backgroundColor: '#F9E5E2' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 2 },
  edit: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 13,
    borderRadius: 16,
    alignItems: 'center',
  },
  editText: { color: '#FFF', fontWeight: '800' },
  delete: {
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: '#C34D4D', fontWeight: '800' },
  detailGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    padding: 15,
  },
  label: { color: Colors.subtext, fontSize: 12 },
  value: { color: Colors.text, marginTop: 5, lineHeight: 21 },
  heading: { color: Colors.text, fontSize: 17, fontWeight: '800', marginTop: 21, marginBottom: 9 },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  image: { width: 100, height: 100, borderRadius: 12 },
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
});
