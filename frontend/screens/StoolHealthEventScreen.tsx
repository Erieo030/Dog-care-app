/** 用途：提供 10～20 秒可完成的排便異常專屬新增與編輯快速表單。 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '../constants/Colors';
import DatePickerField from '../components/DatePickerField';
import AttachmentPicker from '../components/AttachmentPicker';
import { ATTACHMENT_LIMITS } from '../constants/Attachments';
import { SEVERITY_LABELS } from '../constants/HealthEvents';
import {
  buildStoolSummary,
  normalizeStoolDetails,
  shouldShowStoolSafety,
  STOOL_COLOR_OPTIONS,
  STOOL_CONSISTENCY_OPTIONS,
  STOOL_SAFETY_MESSAGE,
} from '../constants/Stool';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import type { HomeStackParamList } from '../navigation/types';
import * as service from '../services/healthEventService';
import { Attachment, Severity, StoolColor, StoolConsistency, StoolDetails } from '../types';

const severities = Object.entries(SEVERITY_LABELS) as Array<[Severity, string]>;
const emptyDetails = (): StoolDetails => ({
  stoolConsistency: undefined as unknown as StoolConsistency,
  stoolColor: undefined as unknown as StoolColor,
  hasMucus: false,
  suspectedBlood: false,
  hasForeignObject: false,
  suspectedParasite: false,
});

type Props = NativeStackScreenProps<HomeStackParamList, 'StoolHealthEvent'>;

export default function StoolHealthEventScreen({ route, navigation }: Props) {
  const eventId = route.params?.eventId as string | undefined;
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [details, setDetails] = useState<StoolDetails>(emptyDetails);
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [severity, setSeverity] = useState<Severity>('mild');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!eventId) return;
    const currentRequest = ++requestId.current;
    if (!session?.userId || !selectedPet) {
      setError('找不到目前選取的毛孩');
      setLoading(false);
      return;
    }
    try {
      setError('');
      const result = await service.getHealthEvent(session.userId, eventId);
      if (currentRequest !== requestId.current) return;
      if (result.petId !== selectedPet.id || result.type !== 'abnormal_stool') {
        setError('找不到目前毛孩的排便異常紀錄');
        return;
      }
      setDetails(normalizeStoolDetails(result.details ?? {}));
      setOccurredAt(new Date(result.occurredAt));
      setSeverity(result.severity);
      setNotes(result.notes ?? '');
      setImages(result.attachments ?? []);
    } catch (requestError) {
      if (currentRequest !== requestId.current) return;
      setError((requestError as Error).message || '無法載入排便異常紀錄');
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [eventId, selectedPet, session?.userId]);

  useFocusEffect(
    useCallback(() => {
      if (eventId) {
        setLoading(true);
        load();
      }
    }, [eventId, load]),
  );

  const submit = async () => {
    if (!selectedPet || !session?.userId || submitting) return;
    if (!details.stoolConsistency) return Alert.alert('尚未完成', '請選擇排便形狀');
    if (!details.stoolColor) return Alert.alert('尚未完成', '請選擇排便顏色');
    if (Number.isNaN(occurredAt.getTime()) || occurredAt.getTime() > Date.now()) {
      return Alert.alert('時間錯誤', '請選擇有效且不晚於現在的發生時間');
    }
    setSubmitting(true);
    try {
      const input = {
        type: 'abnormal_stool' as const,
        occurredAt: occurredAt.toISOString(),
        severity,
        summary: buildStoolSummary(details),
        details,
        notes: notes.trim(),
        attachmentIds: images

          .map((item) => item.id),
      };
      if (eventId) await service.updateStoolHealthEvent(session.userId, eventId, input);
      else await service.createStoolHealthEvent(session.userId, selectedPet.id, input);
      const safety = shouldShowStoolSafety(details, severity);
      Alert.alert(
        '已儲存',
        safety
          ? `排便異常紀錄已儲存。\n\n安全提醒：${STOOL_SAFETY_MESSAGE}`
          : '排便異常紀錄已加入近期動態。',
        [{ text: '完成', onPress: () => (eventId ? navigation.goBack() : navigation.popToTop()) }],
      );
    } catch (requestError) {
      Alert.alert('儲存失敗', (requestError as Error).message || '請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.stateText}>正在載入排便異常紀錄…</Text>
      </View>
    );
  if (error)
    return (
      <View style={styles.center}>
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
    );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{eventId ? '編輯排便異常紀錄' : '記錄排便異常'}</Text>
        <Text style={styles.subtitle}>只記錄觀察到的外觀與狀況，不提供疾病診斷。</Text>

        <Text style={styles.label}>形狀（必填）</Text>
        <OptionGroup
          options={STOOL_CONSISTENCY_OPTIONS}
          value={details.stoolConsistency}
          onChange={(stoolConsistency) =>
            setDetails((current) => ({ ...current, stoolConsistency }))
          }
        />

        <Text style={styles.label}>顏色（必填）</Text>
        <OptionGroup
          options={STOOL_COLOR_OPTIONS}
          value={details.stoolColor}
          onChange={(stoolColor) => setDetails((current) => ({ ...current, stoolColor }))}
        />

        <Text style={styles.label}>其他狀況（可複選）</Text>
        <View style={styles.chips}>
          <Toggle
            text="黏液"
            active={details.hasMucus}
            onPress={() => setDetails((current) => ({ ...current, hasMucus: !current.hasMucus }))}
          />
          <Toggle
            text="疑似血液"
            active={details.suspectedBlood}
            onPress={() =>
              setDetails((current) => ({ ...current, suspectedBlood: !current.suspectedBlood }))
            }
          />
          <Toggle
            text="異物"
            active={details.hasForeignObject}
            onPress={() =>
              setDetails((current) => ({ ...current, hasForeignObject: !current.hasForeignObject }))
            }
          />
          <Toggle
            text="疑似蟲體"
            active={details.suspectedParasite}
            onPress={() =>
              setDetails((current) => ({
                ...current,
                suspectedParasite: !current.suspectedParasite,
              }))
            }
          />
        </View>

        <DatePickerField
          label="發生日期（必填）"
          value={occurredAt}
          mode="date"
          maximumDate={new Date()}
          disabled={submitting}
          onChange={setOccurredAt}
        />

        <Text style={styles.label}>嚴重程度（必填）</Text>
        <OptionGroup<Severity> options={severities} value={severity} onChange={setSeverity} />

        <AttachmentPicker
          userId={session!.userId}
          petId={selectedPet!.id}
          sourceType="health_event"
          limit={ATTACHMENT_LIMITS.health_event}
          value={images}
          onChange={setImages}
          disabled={submitting}
        />

        <Text style={styles.label}>備註（最多 500 字）</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          maxLength={500}
          multiline
          placeholder="簡短補充觀察到的狀況"
          placeholderTextColor={Colors.subtext}
        />

        {shouldShowStoolSafety(details, severity) && (
          <View style={styles.safety}>
            <Text style={styles.safetyTitle}>安全提醒</Text>
            <Text style={styles.safetyText}>{STOOL_SAFETY_MESSAGE}</Text>
          </View>
        )}

        <TouchableOpacity
          disabled={submitting}
          style={[styles.submit, submitting && styles.disabled]}
          onPress={submit}
        >
          <Text style={styles.submitText}>{submitting ? '儲存中…' : '儲存紀錄'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function OptionGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<[T, string]>;
  value?: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map(([key, label]) => (
        <Toggle key={key} text={label} active={value === key} onPress={() => onChange(key)} />
      ))}
    </View>
  );
}

function Toggle({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{text}</Text>
    </TouchableOpacity>
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
  title: { color: Colors.text, fontSize: 27, fontWeight: '800' },
  subtitle: { color: Colors.subtext, lineHeight: 21, marginTop: 6, marginBottom: 5 },
  label: { color: Colors.text, fontWeight: '700', marginTop: 18, marginBottom: 9 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: {
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 17,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  chipActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  chipText: { color: Colors.text },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
  input: {
    minHeight: 54,
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: Colors.text,
  },
  inputText: { color: Colors.text },
  outline: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  outlineText: { color: Colors.text, fontWeight: '700' },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  image: { width: 76, height: 76, borderRadius: 12 },
  removeImage: { color: '#C34D4D', fontSize: 12, textAlign: 'center', marginTop: 3 },
  notes: { minHeight: 88, paddingTop: 13, textAlignVertical: 'top' },
  safety: {
    backgroundColor: '#FFF3E4',
    borderWidth: 1,
    borderColor: '#F0C58A',
    borderRadius: 16,
    padding: 15,
    marginTop: 20,
  },
  safetyTitle: { color: '#8A5420', fontWeight: '800' },
  safetyText: { color: '#70451D', lineHeight: 21, marginTop: 5 },
  submit: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitText: { color: '#FFF', fontWeight: '800' },
  disabled: { opacity: 0.5 },
  stateText: { color: Colors.subtext, marginTop: 10 },
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
