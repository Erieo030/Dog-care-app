/** 用途：以單一共用流程新增及編輯食慾、精神與喝水異常快速紀錄。 */
import React, { useCallback, useRef, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import SupplementalNotesField from '../components/SupplementalNotesField';

import {
  HealthSafetyNotice,
  MultiSelectOptionGroup,
  QuickOptionGroup,
} from '../components/QuickHealthFields';
import { Colors } from '../constants/Colors';
import {
  FORM_BUTTON_HEIGHT,
  FORM_BUTTON_RADIUS,
  FORM_FIELD_HEIGHT,
  FORM_FIELD_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_WEIGHT,
  FORM_FIELD_LABEL_MARGIN_BOTTOM,
  FORM_FIELD_LABEL_MARGIN_TOP,
  FORM_FIELD_PADDING_HORIZONTAL,
  FORM_FIELD_RADIUS,
  FORM_PAGE_HORIZONTAL_PADDING,
} from '../constants/FormTokens';
import DatePickerField from '../components/DatePickerField';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { showQuickRecordFeedback } from '../utils/quickRecordFeedback';
import AttachmentPicker from '../components/AttachmentPicker';
import { ATTACHMENT_LIMITS } from '../constants/Attachments';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { SEVERITY_LABELS } from '../constants/HealthEvents';
import {
  buildObservationSummary,
  emptyObservationValues,
  OBSERVATION_CONFIG,
  OBSERVATION_SAFETY_MESSAGE,
  normalizeObservationDetails,
  shouldShowObservationSafety,
} from '../constants/ObservationHealthEvents';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import type { HomeStackParamList } from '../navigation/types';
import * as service from '../services/healthEventService';
import { Attachment, ObservationHealthEventType, Severity } from '../types';
import {
  HealthEventErrorState,
  HealthEventLoadingState,
} from '../features/health-events/components/HealthEventScreenState';

const severities = Object.entries(SEVERITY_LABELS) as Array<[Severity, string]>;
type Props = NativeStackScreenProps<HomeStackParamList, 'ObservationHealthEvent'>;

export default function ObservationHealthEventScreen({ route, navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const type = route.params.type as ObservationHealthEventType;
  const eventId = route.params.eventId as string | undefined;
  const quickEntry = route.params.quickEntry === true;
  const config = OBSERVATION_CONFIG[type];
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [values, setValues] = useState(() => emptyObservationValues(type));
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [severity, setSeverity] = useState<Severity>('mild');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!eventId) return;
    const currentRequest = ++requestId.current;
    if (!session?.userId || !selectedPet) {
      setError('找不到目前選取的毛孩');
      setLoading(false);
      return;
    }
    try {
      setError('');
      const result = await service.getHealthEvent(session.userId, eventId, signal);
      if (currentRequest !== requestId.current) return;
      if (result.petId !== selectedPet.id || result.type !== type) {
        setError(`找不到目前毛孩的${config.title}紀錄`);
        return;
      }
      setValues(normalizeObservationDetails(type, result.details ?? {}));
      setOccurredAt(new Date(result.occurredAt));
      setSeverity(result.severity);
      setNotes(result.notes ?? '');
      setImages(result.attachments ?? []);
    } catch (requestError) {
      if (currentRequest === requestId.current)
        setError((requestError as Error).message || `無法載入${config.title}紀錄`);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [config.title, eventId, selectedPet, session?.userId, type]);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      if (eventId) {
        setLoading(true);
        void load(controller.signal);
      }
      return () => {
        controller.abort();
        requestId.current += 1;
      };
    }, [eventId, load]),
  );

  const submit = async () => {
    if (!selectedPet || !session?.userId || submitting) return;
    if (!values[config.primaryKey]) return Alert.alert('尚未完成', `請選擇${config.primaryLabel}`);
    if (Number.isNaN(occurredAt.getTime()) || occurredAt.getTime() > Date.now())
      return Alert.alert('時間錯誤', '請選擇有效且不晚於現在的發生時間');
    setSubmitting(true);
    try {
      const input = {
        type,
        occurredAt: occurredAt.toISOString(),
        severity,
        summary: buildObservationSummary(type, values),
        details: values,
        notes: notes.trim(),
        attachmentIds: images.map((item) => item.id),
      };
      if (eventId) await service.updateObservationHealthEvent(session.userId, eventId, input);
      else await service.createObservationHealthEvent(session.userId, selectedPet.id, input);
      const safety = shouldShowObservationSafety(type, values, severity);
      const successMessage = safety
        ? `${config.title}紀錄已儲存。\n\n安全提醒：${OBSERVATION_SAFETY_MESSAGE}`
        : `${config.title}紀錄已加入近期動態。`;
      if (quickEntry && !eventId) {
        showQuickRecordFeedback({
          message: `${successMessage}\n\n完整內容可到「紀錄」查看。`,
          onDone: () => navigation.popToTop(),
          onAddAnother: () =>
            navigation.replace('ObservationHealthEvent', { type, quickEntry: true }),
        });
      } else {
        Alert.alert('已儲存', successMessage, [
          { text: '完成', onPress: () => (eventId ? navigation.goBack() : navigation.popToTop()) },
        ]);
      }
    } catch (requestError) {
      Alert.alert('儲存失敗', (requestError as Error).message || '請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <HealthEventLoadingState text={`正在載入${config.title}紀錄…`} />;
  if (error)
    return (
      <HealthEventErrorState
        text={error}
        onRetry={() => {
          setLoading(true);
          load();
        }}
      />
    );
  const safety = shouldShowObservationSafety(type, values, severity);
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
      >
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="eye-outline" size={22} color={Colors.primary} />
          </View>
          <View style={styles.introCopy}>
            <Text style={styles.title}>
              {eventId ? `編輯${config.title}紀錄` : `記錄${config.title}`}
            </Text>
            <Text style={styles.subtitle}>只保存觀察到的狀況，不提供疾病診斷或治療建議。</Text>
          </View>
        </View>
        <Text style={styles.label}>{config.primaryLabel}（必填）</Text>
        <QuickOptionGroup
          options={config.primaryOptions}
          value={values[config.primaryKey] as string | undefined}
          onChange={(value) => setValues((current) => ({ ...current, [config.primaryKey]: value }))}
        />
        {config.optionalGroups.map((group) => (
          <View key={group.key}>
            <Text style={styles.label}>{group.label}</Text>
            <QuickOptionGroup
              options={group.options}
              value={values[group.key] as string | undefined}
              onChange={(value) =>
                setValues((current) => ({
                  ...current,
                  [group.key]: current[group.key] === value ? '' : value,
                }))
              }
            />
          </View>
        ))}
        {config.multiGroup && (
          <>
            <Text style={styles.label}>{config.multiGroup.label}</Text>
            <MultiSelectOptionGroup
              options={config.multiGroup.options}
              values={(values[config.multiGroup.key] as string[]) ?? []}
              onChange={(selected) =>
                setValues((current) => ({ ...current, [config.multiGroup!.key]: selected }))
              }
            />
          </>
        )}
        <DatePickerField
          label="發生時間（必填）"
          value={occurredAt}
          mode="datetime"
          maximumDate={new Date()}
          disabled={submitting}
          onChange={setOccurredAt}
        />
        <Text style={styles.label}>嚴重程度（必填）</Text>
        <QuickOptionGroup
          options={severities}
          value={severity}
          onChange={(value) => setSeverity(value as Severity)}
        />
        <AttachmentPicker
          userId={session!.userId}
          petId={selectedPet!.id}
          sourceType="health_event"
          limit={ATTACHMENT_LIMITS.health_event}
          value={images}
          onChange={setImages}
          disabled={submitting}
        />
        <SupplementalNotesField
          value={notes}
          onChange={setNotes}
          maxLength={500}
          placeholder="簡短補充觀察到的狀況"
        />
        {safety && <HealthSafetyNotice message={OBSERVATION_SAFETY_MESSAGE} />}
        <AppButton
          title={submitting ? '儲存中…' : '儲存紀錄'}
          variant="primary"
          disabled={submitting}
          busy={submitting}
          style={[styles.submit, submitting && styles.disabled]}
          textStyle={styles.submitText}
          onPress={submit}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: FORM_PAGE_HORIZONTAL_PADDING, paddingTop: 18, paddingBottom: 34 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 7 },
  introIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: { flex: 1, minWidth: 0 },
  title: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: Colors.subtext, lineHeight: 18, marginTop: 2, fontSize: 12 },
  label: {
    color: Colors.text,
    fontSize: FORM_FIELD_LABEL_FONT_SIZE,
    fontWeight: FORM_FIELD_LABEL_FONT_WEIGHT,
    marginTop: FORM_FIELD_LABEL_MARGIN_TOP,
    marginBottom: FORM_FIELD_LABEL_MARGIN_BOTTOM,
  },
  input: {
    fontSize: FORM_FIELD_FONT_SIZE,
    minHeight: FORM_FIELD_HEIGHT,
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: FORM_FIELD_RADIUS,
    paddingHorizontal: FORM_FIELD_PADDING_HORIZONTAL,
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
  submit: {
    backgroundColor: Colors.primary,
    borderRadius: FORM_BUTTON_RADIUS,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    minHeight: FORM_BUTTON_HEIGHT,
  },
  submitText: { color: '#FFF', fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
