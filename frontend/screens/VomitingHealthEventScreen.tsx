/** 用途：提供 10～20 秒可完成的嘔吐專屬新增與編輯快速表單。 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '../constants/Colors';
import AttachmentPicker from '../components/AttachmentPicker';
import { ATTACHMENT_LIMITS } from '../constants/Attachments';
import { SEVERITY_LABELS } from '../constants/HealthEvents';
import {
  buildVomitingSummary,
  DRINKING_OPTIONS,
  normalizeVomitingDetails,
  ENERGY_OPTIONS,
  shouldShowVomitingSafety,
  VOMIT_COLOR_OPTIONS,
  VOMIT_COUNT_OPTIONS,
  VOMITING_SAFETY_MESSAGE,
} from '../constants/Vomiting';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import type { HomeStackParamList } from '../navigation/types';
import * as service from '../services/healthEventService';
import { EnergyCondition, Attachment, Severity, VomitCount, VomitingDetails } from '../types';

const severities = Object.entries(SEVERITY_LABELS) as Array<[Severity, string]>;
const emptyDetails = (): VomitingDetails => ({
  vomitCount: undefined as unknown as VomitCount,
  energyCondition: undefined as unknown as EnergyCondition,
  hasFoam: false,
  hasFood: false,
  suspectedBlood: false,
  suspectedForeignObject: false,
});

type Props = NativeStackScreenProps<HomeStackParamList, 'VomitingHealthEvent'>;

export default function VomitingHealthEventScreen({ route, navigation }: Props) {
  const eventId = route.params?.eventId as string | undefined;
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [details, setDetails] = useState<VomitingDetails>(emptyDetails);
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [severity, setSeverity] = useState<Severity>('mild');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<Attachment[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTime, setShowTime] = useState(false);
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
      if (result.petId !== selectedPet.id || result.type !== 'vomiting') {
        setError('找不到目前毛孩的嘔吐紀錄');
        return;
      }
      const normalized = normalizeVomitingDetails(result.details ?? {});
      setDetails(normalized);
      setOccurredAt(new Date(result.occurredAt));
      setSeverity(result.severity);
      setNotes(result.notes ?? '');
      setImages(result.attachments ?? []);
      setShowAdvanced(
        Boolean(
          normalized.color ||
            normalized.drinkingCondition ||
            normalized.hasFoam ||
            normalized.hasFood ||
            normalized.suspectedBlood ||
            normalized.suspectedForeignObject ||
            result.notes,
        ),
      );
    } catch (requestError) {
      if (currentRequest !== requestId.current) return;
      setError((requestError as Error).message || '無法載入嘔吐紀錄');
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
    if (!details.vomitCount) return Alert.alert('尚未完成', '請選擇發生次數');
    if (!details.energyCondition) return Alert.alert('尚未完成', '請選擇精神狀況');
    if (Number.isNaN(occurredAt.getTime()) || occurredAt.getTime() > Date.now()) {
      return Alert.alert('時間錯誤', '請選擇有效且不晚於現在的發生時間');
    }
    setSubmitting(true);
    try {
      const input = {
        type: 'vomiting' as const,
        occurredAt: occurredAt.toISOString(),
        severity,
        summary: buildVomitingSummary(details),
        details,
        notes: notes.trim(),
        attachmentIds: images
          .filter((item) => item.storageProvider !== 'legacy_local')
          .map((item) => item.id),
      };
      if (eventId) await service.updateVomitingHealthEvent(session.userId, eventId, input);
      else await service.createVomitingHealthEvent(session.userId, selectedPet.id, input);
      const safety = shouldShowVomitingSafety(details, severity);
      Alert.alert(
        '已儲存',
        safety
          ? `嘔吐紀錄已儲存。\n\n安全提醒：${VOMITING_SAFETY_MESSAGE}`
          : '嘔吐紀錄已加入近期動態。',
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
        <Text style={styles.stateText}>正在載入嘔吐紀錄…</Text>
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
        <Text style={styles.title}>{eventId ? '編輯嘔吐紀錄' : '記錄嘔吐'}</Text>
        <Text style={styles.subtitle}>只記錄看到的狀況，不提供疾病診斷。</Text>

        <Text style={styles.label}>發生次數 *</Text>
        <OptionGroup
          options={VOMIT_COUNT_OPTIONS}
          value={details.vomitCount}
          onChange={(vomitCount) => setDetails((current) => ({ ...current, vomitCount }))}
        />

        <Text style={styles.label}>精神狀況 *</Text>
        <OptionGroup
          options={ENERGY_OPTIONS}
          value={details.energyCondition}
          onChange={(energyCondition) => setDetails((current) => ({ ...current, energyCondition }))}
        />

        <Text style={styles.label}>發生時間 *</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowTime(true)}>
          <Text style={styles.inputText}>{occurredAt.toLocaleString('zh-TW')}</Text>
        </TouchableOpacity>
        {showTime && (
          <DateTimePicker
            value={occurredAt}
            mode="datetime"
            maximumDate={new Date()}
            onChange={(_, value) => {
              setShowTime(Platform.OS === 'ios');
              if (value) setOccurredAt(value);
            }}
          />
        )}

        <Text style={styles.label}>嚴重程度 *</Text>
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
        <TouchableOpacity
          style={styles.advancedButton}
          onPress={() => setShowAdvanced((current) => !current)}
        >
          <Text style={styles.advancedText}>{showAdvanced ? '收合補充資訊' : '補充更多資訊'}</Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advanced}>
            <Text style={styles.label}>顏色（選填）</Text>
            <OptionGroup
              options={VOMIT_COLOR_OPTIONS}
              value={details.color}
              onChange={(color) => setDetails((current) => ({ ...current, color }))}
            />

            <Text style={styles.label}>內容特徵（可複選）</Text>
            <View style={styles.chips}>
              <Toggle
                text="有泡沫"
                active={details.hasFoam}
                onPress={() => setDetails((current) => ({ ...current, hasFoam: !current.hasFoam }))}
              />
              <Toggle
                text="有未消化食物"
                active={details.hasFood}
                onPress={() => setDetails((current) => ({ ...current, hasFood: !current.hasFood }))}
              />
              <Toggle
                text="疑似有血"
                active={details.suspectedBlood}
                onPress={() =>
                  setDetails((current) => ({ ...current, suspectedBlood: !current.suspectedBlood }))
                }
              />
              <Toggle
                text="疑似有異物"
                active={details.suspectedForeignObject}
                onPress={() =>
                  setDetails((current) => ({
                    ...current,
                    suspectedForeignObject: !current.suspectedForeignObject,
                  }))
                }
              />
            </View>

            <Text style={styles.label}>飲水狀況（選填）</Text>
            <OptionGroup
              options={DRINKING_OPTIONS}
              value={details.drinkingCondition}
              onChange={(drinkingCondition) =>
                setDetails((current) => ({ ...current, drinkingCondition }))
              }
            />

            <Text style={styles.label}>備註（選填，最多 500 字）</Text>
            <TextInput
              style={[styles.input, styles.notes]}
              value={notes}
              onChangeText={setNotes}
              maxLength={500}
              multiline
              placeholder="簡短補充觀察到的狀況"
              placeholderTextColor={Colors.subtext}
            />
          </View>
        )}

        {shouldShowVomitingSafety(details, severity) && (
          <View style={styles.safety}>
            <Text style={styles.safetyTitle}>安全提醒</Text>
            <Text style={styles.safetyText}>{VOMITING_SAFETY_MESSAGE}</Text>
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
  quickActions: { marginTop: 20, gap: 5 },
  outline: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  outlineText: { color: Colors.text, fontWeight: '700' },
  advancedButton: { paddingVertical: 14, alignItems: 'center' },
  advancedText: { color: Colors.primary, fontWeight: '700' },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  image: { width: 76, height: 76, borderRadius: 12 },
  removeImage: { color: '#C34D4D', fontSize: 12, textAlign: 'center', marginTop: 3 },
  advanced: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 8, paddingTop: 2 },
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
