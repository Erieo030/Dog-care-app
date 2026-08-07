/** 用途：以單一共用流程新增及編輯食慾、精神與喝水異常快速紀錄。 */
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';

import { HealthSafetyNotice, MultiSelectOptionGroup, QuickOptionGroup } from '../components/QuickHealthFields';
import { Colors } from '../constants/Colors';
import AttachmentPicker from '../components/AttachmentPicker';
import { ATTACHMENT_LIMITS } from '../constants/Attachments';
import { SEVERITY_LABELS } from '../constants/HealthEvents';
import { buildObservationSummary, emptyObservationValues, OBSERVATION_CONFIG, OBSERVATION_SAFETY_MESSAGE, normalizeObservationDetails, shouldShowObservationSafety } from '../constants/ObservationHealthEvents';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import * as service from '../services/healthEventService';
import { Attachment, HealthEvent, ObservationHealthEventType, Severity } from '../types';

const severities = Object.entries(SEVERITY_LABELS) as Array<[Severity, string]>;
export default function ObservationHealthEventScreen({ route, navigation }: any) {
  const type = route.params.type as ObservationHealthEventType;
  const eventId = route.params.eventId as string | undefined;
  const config = OBSERVATION_CONFIG[type];
  const { session } = useAuth(); const { selectedPet } = usePet();
  const [item, setItem] = useState<HealthEvent | null>(null);
  const [values, setValues] = useState(() => emptyObservationValues(type));
  const [occurredAt, setOccurredAt] = useState(new Date()); const [severity, setSeverity] = useState<Severity>('mild');
  const [notes, setNotes] = useState(''); const [images, setImages] = useState<Attachment[]>([]); const [showTime, setShowTime] = useState(false);
  const [loading, setLoading] = useState(Boolean(eventId)); const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false); const [imageSelecting, setImageSelecting] = useState(false); const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!eventId) return; const currentRequest = ++requestId.current;
    if (!session?.userId || !selectedPet) { setError('找不到目前選取的毛孩'); setLoading(false); return; }
    try {
      setError(''); const result = await service.getHealthEvent(session.userId, eventId);
      if (currentRequest !== requestId.current) return;
      if (result.petId !== selectedPet.id || result.type !== type) { setError(`找不到目前毛孩的${config.title}紀錄`); return; }
      setItem(result); setValues(normalizeObservationDetails(type, result.details ?? {}));
      setOccurredAt(new Date(result.occurredAt)); setSeverity(result.severity); setNotes(result.notes ?? ''); setImages(result.attachments ?? []);
    } catch (requestError) { if (currentRequest === requestId.current) setError((requestError as Error).message || `無法載入${config.title}紀錄`); }
    finally { if (currentRequest === requestId.current) setLoading(false); }
  }, [config.title, eventId, selectedPet?.id, session?.userId, type]);
  useFocusEffect(useCallback(() => { if (eventId) { setLoading(true); load(); } }, [eventId, load]));

  const pickImage = async () => {
    if (imageSelecting || submitting || images.length >= 5) return; setImageSelecting(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('需要權限', '請允許存取相簿以加入照片');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: Math.max(1, 5 - images.length) });
      if (!result.canceled) return;
    } catch (requestError) { Alert.alert('無法選擇照片', (requestError as Error).message); }
    finally { setImageSelecting(false); }
  };

  const submit = async () => {
    if (!selectedPet || !session?.userId || submitting || imageSelecting) return;
    if (!values[config.primaryKey]) return Alert.alert('尚未完成', `請選擇${config.primaryLabel}`);
    if (Number.isNaN(occurredAt.getTime()) || occurredAt.getTime() > Date.now()) return Alert.alert('時間錯誤', '請選擇有效且不晚於現在的發生時間');
    setSubmitting(true);
    try {
      const input = { type, occurredAt: occurredAt.toISOString(), severity, summary: buildObservationSummary(type, values), details: values, notes: notes.trim(), attachmentIds: images.filter(item => item.storageProvider !== 'legacy_local').map(item => item.id) };
      if (eventId) await service.updateObservationHealthEvent(session.userId, eventId, input);
      else await service.createObservationHealthEvent(session.userId, selectedPet.id, input);
      const safety = shouldShowObservationSafety(type, values, severity);
      Alert.alert('已儲存', safety ? `${config.title}紀錄已儲存。\n\n安全提醒：${OBSERVATION_SAFETY_MESSAGE}` : `${config.title}紀錄已加入近期動態。`,
        [{ text: '完成', onPress: () => eventId ? navigation.goBack() : navigation.popToTop() }]);
    } catch (requestError) { Alert.alert('儲存失敗', (requestError as Error).message || '請稍後再試'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /><Text style={styles.stateText}>正在載入{config.title}紀錄…</Text></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text><TouchableOpacity style={styles.retry} onPress={() => { setLoading(true); load(); }}><Text style={styles.retryText}>重新載入</Text></TouchableOpacity></View>;
  const safety = shouldShowObservationSafety(type, values, severity);
  return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>{eventId ? `編輯${config.title}紀錄` : `記錄${config.title}`}</Text>
    <Text style={styles.subtitle}>只保存觀察到的狀況，不提供疾病診斷或治療建議。</Text>
    <Text style={styles.label}>{config.primaryLabel} *</Text>
    <QuickOptionGroup options={config.primaryOptions} value={values[config.primaryKey] as string | undefined} onChange={(value) => setValues((current) => ({ ...current, [config.primaryKey]: value }))} />
    {config.optionalGroups.map((group) => <View key={group.key}><Text style={styles.label}>{group.label}</Text>
      <QuickOptionGroup options={group.options} value={values[group.key] as string | undefined} onChange={(value) => setValues((current) => ({ ...current, [group.key]: current[group.key] === value ? '' : value }))} /></View>)}
    {config.multiGroup && <><Text style={styles.label}>{config.multiGroup.label}</Text><MultiSelectOptionGroup options={config.multiGroup.options}
      values={(values[config.multiGroup.key] as string[]) ?? []} onChange={(selected) => setValues((current) => ({ ...current, [config.multiGroup!.key]: selected }))} /></>}
    <Text style={styles.label}>發生時間 *</Text><TouchableOpacity style={styles.input} onPress={() => setShowTime(true)}><Text style={styles.inputText}>{occurredAt.toLocaleString('zh-TW')}</Text></TouchableOpacity>
    {showTime && <DateTimePicker value={occurredAt} mode="datetime" maximumDate={new Date()} onChange={(_, value) => { setShowTime(Platform.OS === 'ios'); if (value) setOccurredAt(value); }} />}
    <Text style={styles.label}>嚴重程度 *</Text><QuickOptionGroup options={severities} value={severity} onChange={(value) => setSeverity(value as Severity)} />
    <AttachmentPicker userId={session!.userId} petId={selectedPet!.id} sourceType="health_event" limit={ATTACHMENT_LIMITS.health_event} value={images} onChange={setImages} disabled={submitting} />
    <Text style={styles.label}>備註（選填，最多 500 字）</Text><TextInput style={[styles.input, styles.notes]} value={notes} onChangeText={setNotes} maxLength={500} multiline placeholder="簡短補充觀察到的狀況" placeholderTextColor={Colors.subtext} />
    {safety && <HealthSafetyNotice message={OBSERVATION_SAFETY_MESSAGE} />}
    <TouchableOpacity disabled={submitting || imageSelecting} style={[styles.submit, (submitting || imageSelecting) && styles.disabled]} onPress={submit}><Text style={styles.submitText}>{submitting ? '儲存中…' : '儲存紀錄'}</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background }, content: { padding: 20, paddingBottom: 50 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: 24 },
  title: { color: Colors.text, fontSize: 27, fontWeight: '800' }, subtitle: { color: Colors.subtext, lineHeight: 21, marginTop: 6, marginBottom: 5 }, label: { color: Colors.text, fontWeight: '700', marginTop: 18, marginBottom: 9 },
  input: { minHeight: 54, justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 14, color: Colors.text }, inputText: { color: Colors.text },
  outline: { borderWidth: 1, borderColor: Colors.primary, borderRadius: 14, padding: 14, alignItems: 'center' }, outlineText: { color: Colors.text, fontWeight: '700' }, images: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }, image: { width: 76, height: 76, borderRadius: 12 }, removeImage: { color: '#C34D4D', fontSize: 12, textAlign: 'center', marginTop: 3 },
  notes: { minHeight: 88, paddingTop: 13, textAlignVertical: 'top' }, submit: { backgroundColor: Colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 24 }, submitText: { color: '#FFF', fontWeight: '800' }, disabled: { opacity: 0.5 }, stateText: { color: Colors.subtext, marginTop: 10 }, error: { color: '#C55B5B', textAlign: 'center' }, retry: { marginTop: 14, borderWidth: 1, borderColor: Colors.primary, borderRadius: 13, paddingHorizontal: 18, paddingVertical: 10 }, retryText: { color: Colors.text, fontWeight: '700' },
});
