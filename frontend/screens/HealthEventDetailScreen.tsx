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

import { Colors } from '../constants/Colors';
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
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import * as service from '../services/healthEventService';
import { HealthEvent } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'HealthEventDetail'>;

export default function HealthEventDetailScreen({ route, navigation }: Props) {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [item, setItem] = useState<HealthEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setItem(null);
    if (!session?.userId || !selectedPet) {
      setError('找不到目前選取的毛孩');
      setLoading(false);
      return;
    }
    try {
      setError('');
      const result = await service.getHealthEvent(session.userId, route.params.eventId);
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
      setLoading(true);
      load();
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.actions}>
          <TouchableOpacity
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
          >
            <Text style={styles.editText}>編輯紀錄</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={submitting} style={styles.delete} onPress={remove}>
            <Text style={styles.deleteText}>{submitting ? '刪除中…' : '刪除'}</Text>
          </TouchableOpacity>
        </View>
        <Row label="異常類型" value={HEALTH_EVENT_LABELS[item.type]} />
        <Row label="摘要" value={item.summary} />
        <Row label="發生時間" value={new Date(item.occurredAt).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} />
        <Row label="嚴重程度" value={SEVERITY_LABELS[item.severity]} />
        {!!item.notes && <Row label="備註" value={item.notes} />}
        {!!detailRows.length && (
          <>
            <Text style={styles.heading}>補充資訊</Text>
            {detailRows.map(([label, value]) => (
              <Row key={label} label={label} value={String(value)} />
            ))}
          </>
        )}
        <>
          <Text style={styles.heading}>照片</Text>
          <AttachmentGallery items={item.attachments ?? []} userId={session!.userId} />
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
  content: { padding: 18, paddingBottom: 50 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  edit: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  editText: { color: '#FFF', fontWeight: '800' },
  delete: {
    borderWidth: 1,
    borderColor: '#D96C6C',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 14,
  },
  deleteText: { color: '#C34D4D', fontWeight: '800' },
  row: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    padding: 15,
  },
  label: { color: Colors.subtext, fontSize: 12 },
  value: { color: Colors.text, marginTop: 5, lineHeight: 21 },
  heading: { color: Colors.text, fontSize: 20, fontWeight: '800', marginTop: 22, marginBottom: 10 },
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
