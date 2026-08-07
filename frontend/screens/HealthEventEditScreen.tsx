/** 用途：編輯健康異常紀錄既有的通用欄位，保留詳細資料與本機圖片 URI。 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';

import { Colors } from '../constants/Colors';
import AttachmentPicker from '../components/AttachmentPicker';
import { ATTACHMENT_LIMITS } from '../constants/Attachments';
import { HEALTH_EVENT_LABELS, SEVERITY_LABELS } from '../constants/HealthEvents';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import * as service from '../services/healthEventService';
import { Attachment, HealthEvent, HealthEventType, Severity } from '../types';

const eventTypes = (Object.keys(HEALTH_EVENT_LABELS) as HealthEventType[])
  .filter((value) => value !== 'vomiting' && value !== 'abnormal_stool');
const severities = Object.keys(SEVERITY_LABELS) as Severity[];

export default function HealthEventEditScreen({ route, navigation }: any) {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [item, setItem] = useState<HealthEvent | null>(null);
  const [type, setType] = useState<HealthEventType>('other');
  const [summary, setSummary] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [severity, setSeverity] = useState<Severity>('mild');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showTime, setShowTime] = useState(false);
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
      if (currentRequest !== requestId.current) return;
      setLoading(false);
    }
  }, [route.params.eventId, selectedPet?.id, session?.userId]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
  }, [load]));

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
        attachmentIds: attachments.filter(value => value.storageProvider !== 'legacy_local').map(value => value.id),
      });
      navigation.goBack();
    } catch (requestError) {
      Alert.alert('更新失敗', (requestError as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
  if (error || !item) return <View style={styles.center}>
    <Text style={styles.error}>{error || '找不到健康紀錄'}</Text>
    <TouchableOpacity style={styles.retry} onPress={() => { setLoading(true); load(); }}>
      <Text style={styles.retryText}>重新載入</Text>
    </TouchableOpacity>
  </View>;

  return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.label}>異常類型 *</Text>
    <View style={styles.chips}>{eventTypes.map((value) => <Chip key={value}
      text={HEALTH_EVENT_LABELS[value]} active={type === value} onPress={() => setType(value)} />)}</View>
    <Text style={styles.label}>摘要 *</Text>
    <TextInput value={summary} onChangeText={setSummary} maxLength={200}
      style={styles.input} placeholder="簡短描述這次狀況" placeholderTextColor={Colors.subtext} />
    <Text style={styles.label}>嚴重程度 *</Text>
    <View style={styles.chips}>{severities.map((value) => <Chip key={value}
      text={SEVERITY_LABELS[value]} active={severity === value} onPress={() => setSeverity(value)} />)}</View>
    <Text style={styles.label}>發生時間 *</Text>
    <TouchableOpacity style={styles.input} onPress={() => setShowTime(true)}>
      <Text style={styles.inputText}>{occurredAt.toLocaleString('zh-TW')}</Text>
    </TouchableOpacity>
    {showTime && <DateTimePicker value={occurredAt} mode="datetime" maximumDate={new Date()}
      onChange={(_, value) => { setShowTime(Platform.OS === 'ios'); if (value) setOccurredAt(value); }} />}
    <Text style={styles.label}>備註（選填）</Text>
    <TextInput value={notes} onChangeText={setNotes} maxLength={2000} multiline
      style={[styles.input, styles.notes]} placeholder="補充重要資訊" placeholderTextColor={Colors.subtext} />
    <AttachmentPicker userId={session.userId} petId={item.petId} sourceType="health_event" limit={ATTACHMENT_LIMITS.health_event} value={attachments} onChange={setAttachments} disabled={submitting} />
    <TouchableOpacity disabled={submitting} style={[styles.submit, submitting && styles.disabled]} onPress={submit}>
      <Text style={styles.submitText}>{submitting ? '更新中…' : '儲存修改'}</Text>
    </TouchableOpacity>
  </ScrollView></SafeAreaView>;
}

function Chip({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity disabled={false} style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{text}</Text>
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: 24 },
  label: { color: Colors.text, fontWeight: '700', marginTop: 17, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10 },
  chipActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  chipText: { color: Colors.text },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
  input: { minHeight: 54, justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 14, color: Colors.text },
  inputText: { color: Colors.text },
  notes: { minHeight: 100, paddingTop: 13, textAlignVertical: 'top' },
  hint: { color: Colors.subtext, fontSize: 12, marginTop: 12 },
  submit: { backgroundColor: Colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 25 },
  submitText: { color: '#FFF', fontWeight: '800' },
  disabled: { opacity: 0.55 },
  error: { color: '#C55B5B', textAlign: 'center' },
  retry: { marginTop: 14, borderWidth: 1, borderColor: Colors.primary, borderRadius: 13, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: Colors.text, fontWeight: '700' },
});
