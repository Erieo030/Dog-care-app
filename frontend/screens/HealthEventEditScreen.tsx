/** 用途：編輯健康異常紀錄既有的通用欄位，保留詳細資料與本機圖片 URI。 */
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import SupplementalNotesField from '../components/SupplementalNotesField';

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
} from '../constants/FormTokens';
import DatePickerField from '../components/DatePickerField';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import AttachmentPicker from '../components/AttachmentPicker';
import { ATTACHMENT_LIMITS } from '../constants/Attachments';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { HEALTH_EVENT_LABELS, SEVERITY_LABELS } from '../constants/HealthEvents';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import type { HomeStackParamList } from '../navigation/types';
import * as service from '../services/healthEventService';
import { Attachment, HealthEvent, HealthEventType, Severity } from '../types';
import {
  HealthEventErrorState,
  HealthEventLoadingState,
} from '../features/health-events/components/HealthEventScreenState';

const eventTypes = (Object.keys(HEALTH_EVENT_LABELS) as HealthEventType[]).filter(
  (value) => value !== 'vomiting' && value !== 'abnormal_stool',
);
const severities = Object.keys(SEVERITY_LABELS) as Severity[];

type Props = NativeStackScreenProps<HomeStackParamList, 'HealthEventEdit'>;

export default function HealthEventEditScreen({ route, navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [item, setItem] = useState<HealthEvent | null>(null);
  const [type, setType] = useState<HealthEventType>('other');
  const [summary, setSummary] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [severity, setSeverity] = useState<Severity>('mild');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
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
      setType(result.type);
      setSummary(result.summary);
      setOccurredAt(new Date(result.occurredAt));
      setSeverity(result.severity);
      setNotes(result.notes ?? '');
      setAttachments(result.attachments ?? []);
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

  const submit = async () => {
    if (!item || !session?.userId || submitting) return;
    if (!summary.trim()) return Alert.alert('請填寫摘要', '摘要不可留白');
    if (Number.isNaN(occurredAt.getTime())) return Alert.alert('日期錯誤', '請選擇有效日期');
    if (occurredAt.getTime() > Date.now()) return Alert.alert('日期錯誤', '發生時間不可晚於現在');
    setSubmitting(true);
    try {
      await service.updateHealthEvent(session.userId, item.id, {
        type,
        summary: summary.trim(),
        occurredAt: occurredAt.toISOString(),
        severity,
        notes: notes.trim(),
        details: item.details ?? {},
        attachmentIds: attachments.map((value) => value.id),
      });
      navigation.goBack();
    } catch (requestError) {
      Alert.alert('更新失敗', (requestError as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <HealthEventLoadingState />;
  if (error || !item)
    return (
      <HealthEventErrorState
        text={error || '找不到健康紀錄'}
        onRetry={() => {
          setLoading(true);
          load();
        }}
      />
    );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
      >
        <View style={styles.formIntro}>
          <View style={styles.formIntroIcon}>
            <Ionicons name="heart-outline" size={23} color={Colors.primary} />
          </View>
          <View style={styles.formIntroCopy}>
            <Text style={styles.formEyebrow}>健康觀察</Text>
            <Text style={styles.title}>編輯健康紀錄</Text>
            <Text style={styles.formHint}>保留當時看到的狀況，方便日後回看趨勢。</Text>
          </View>
        </View>
        <Text style={styles.sectionHeading}>這次觀察</Text>
        <Text style={styles.label}>異常類型（必填）</Text>
        <View style={styles.chips}>
          {eventTypes.map((value) => (
            <Chip
              key={value}
              text={HEALTH_EVENT_LABELS[value]}
              active={type === value}
              onPress={() => setType(value)}
            />
          ))}
        </View>
        <Text style={styles.label}>摘要（必填）</Text>
        <TextInput
          value={summary}
          onChangeText={setSummary}
          maxLength={200}
          style={styles.input}
          placeholder="簡短描述這次狀況"
          placeholderTextColor={Colors.subtext}
        />
        <Text style={styles.label}>嚴重程度（必填）</Text>
        <View style={styles.chips}>
          {severities.map((value) => (
            <Chip
              key={value}
              text={SEVERITY_LABELS[value]}
              active={severity === value}
              onPress={() => setSeverity(value)}
            />
          ))}
        </View>
        <DatePickerField
          label="發生日期（必填）"
          value={occurredAt}
          mode="date"
          maximumDate={new Date()}
          disabled={submitting}
          onChange={setOccurredAt}
        />
        <Text style={styles.sectionHeading}>補充資訊</Text>
        <SupplementalNotesField
          value={notes}
          onChange={setNotes}
          maxLength={2000}
          placeholder="補充重要資訊"
        />
        <AttachmentPicker
          userId={session.userId}
          petId={item.petId}
          sourceType="health_event"
          limit={ATTACHMENT_LIMITS.health_event}
          value={attachments}
          onChange={setAttachments}
          disabled={submitting}
        />
        <AppButton
          title={submitting ? '更新中…' : '儲存修改'}
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

function Chip({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      disabled={false}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 42 },
  formIntro: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  formIntroIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  formIntroCopy: { flex: 1 },
  formEyebrow: { color: Colors.primary, fontSize: 13, fontWeight: '800', marginBottom: 2 },
  title: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  formHint: { color: Colors.subtext, fontSize: 13, lineHeight: 19, marginTop: 3 },
  sectionHeading: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 22,
    marginBottom: 2,
  },
  label: {
    color: Colors.text,
    fontSize: FORM_FIELD_LABEL_FONT_SIZE,
    fontWeight: FORM_FIELD_LABEL_FONT_WEIGHT,
    marginTop: FORM_FIELD_LABEL_MARGIN_TOP,
    marginBottom: FORM_FIELD_LABEL_MARGIN_BOTTOM,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
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
  hint: { color: Colors.subtext, fontSize: 12, marginTop: 12 },
  submit: {
    backgroundColor: Colors.primary,
    borderRadius: FORM_BUTTON_RADIUS,
    padding: 16,
    alignItems: 'center',
    marginTop: 25,
    minHeight: FORM_BUTTON_HEIGHT,
  },
  submitText: { color: '#FFF', fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
