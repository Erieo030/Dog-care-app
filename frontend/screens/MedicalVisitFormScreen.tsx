/** 用途：新增或編輯就醫紀錄，支援多筆藥物、附件與回診提醒同步。 */
import React, { useRef, useState } from 'react';
import AttachmentPicker from '../components/AttachmentPicker';
import { ATTACHMENT_LIMITS } from '../constants/Attachments';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DatePickerField from '../components/DatePickerField';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import * as service from '../services/medicalVisitService';
import { reconcileAccountNotifications } from '../services/notificationService';
import { Attachment, Medication } from '../types';
type Props = NativeStackScreenProps<HomeStackParamList, 'MedicalVisitForm'>;
const emptyMedication = (): Medication => ({
  name: '',
  instructions: '',
  timesPerDay: 1,
  startDate: '',
  endDate: '',
  mealTiming: 'any',
  notes: '',
});
const localDate = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const parseDate = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};
export default function MedicalVisitFormScreen({ route, navigation }: Props) {
  const existing = route.params?.visit;
  const duplicate = route.params?.duplicate === true;
  const { session } = useAuth();
  const { selectedPet, pets } = usePet();
  const clientRequestId = useRef(
    existing?.clientRequestId ?? 'visit-' + Date.now() + '-' + Math.random().toString(36).slice(2),
  ).current;
  const [visitedAt, setVisitedAt] = useState(existing ? new Date(existing.visitedAt) : new Date());
  const [reason, setReason] = useState(existing?.reason || '');
  const [clinic, setClinic] = useState(existing?.clinicName || '');
  const [vet, setVet] = useState(existing?.veterinarianName || '');
  const [vetNotes, setVetNotes] = useState(existing?.veterinarianNotes || '');
  const [treatment, setTreatment] = useState(existing?.treatmentNotes || '');
  const [followUp, setFollowUp] = useState(
    existing?.followUpAt ? new Date(existing.followUpAt) : null,
  );
  const [createReminder, setCreateReminder] = useState(Boolean(existing?.followUpReminderId));
  const [cost, setCost] = useState(existing?.cost != null ? String(existing.cost) : '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [attachments, setAttachments] = useState<Attachment[]>(existing?.attachments || []);
  const [medications, setMedications] = useState<Medication[]>(existing?.medications || []);
  const [submitting, setSubmitting] = useState(false);
  const updateMed = (i: number, key: keyof Medication, value: string | number) =>
    setMedications((v) => v.map((m, n) => (n === i ? { ...m, [key]: value } : m)));
  const removeMed = (i: number) =>
    Alert.alert('刪除藥物', '確定移除這筆藥物？', [
      { text: '取消', style: 'cancel' },
      {
        text: '移除',
        style: 'destructive',
        onPress: () => setMedications((v) => v.filter((_, n) => n !== i)),
      },
    ]);
  const validate = () => {
    if (!reason.trim()) {
      Alert.alert('必填欄位', '請填寫看診原因');
      return false;
    }
    if (Number.isNaN(visitedAt.getTime())) {
      Alert.alert('日期錯誤', '請選擇有效的就醫日期');
      return false;
    }
    if (followUp && followUp < visitedAt) {
      Alert.alert('日期錯誤', '回診日期不可早於就醫日期');
      return false;
    }
    if (cost && !/^\d+(\.\d{1,2})?$/.test(cost)) {
      Alert.alert('費用錯誤', '費用需為有效數字，最多兩位小數');
      return false;
    }
    const amount = cost ? Number(cost) : null;
    if (amount != null && (amount < 0 || amount > 10000000)) {
      Alert.alert('費用錯誤', '費用需介於 NT$ 0 至 NT$ 10,000,000');
      return false;
    }
    for (const med of medications) {
      if (!med.name.trim()) {
        Alert.alert('藥物資料', '藥品名稱不可空白，若不需要請移除該筆');
        return false;
      }
      if (!Number.isInteger(med.timesPerDay) || med.timesPerDay < 1 || med.timesPerDay > 10) {
        Alert.alert('藥物資料', '每日次數需為 1 至 10 的整數');
        return false;
      }
      if (med.startDate && med.endDate && med.endDate < med.startDate) {
        Alert.alert('藥物資料', `${med.name}的結束日期不可早於開始日期`);
        return false;
      }
    }
    return true;
  };
  const submit = async () => {
    if (!selectedPet || !session?.userId || submitting || !validate()) return;
    setSubmitting(true);
    try {
      const data = {
        clientRequestId,
        visitedAt: visitedAt.toISOString(),
        reason: reason.trim(),
        clinicName: clinic.trim(),
        veterinarianName: vet.trim(),
        veterinarianNotes: vetNotes.trim(),
        treatmentNotes: treatment.trim(),
        followUpAt: followUp?.toISOString() || null,
        cost: cost ? Number(cost) : null,
        notes: notes.trim(),
        attachmentIds: attachments

          .map((a) => a.id),
        medications: medications.map((m) => ({
          ...m,
          name: m.name.trim(),
          instructions: m.instructions.trim(),
          notes: m.notes.trim(),
        })),
        createFollowUpReminder: Boolean(followUp && createReminder),
      };
      if (existing && !duplicate) await service.updateMedicalVisit(session.userId, existing.id, data);
      else await service.createMedicalVisit(session.userId, selectedPet.id, data);
      await reconcileAccountNotifications(session.userId, pets).catch(() => undefined);
      Alert.alert('已儲存', '就醫紀錄、時間軸與回診提醒已同步。', [
        { text: '完成', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('儲存失敗', (e as Error).message || '請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };
  const field = (
    label: string,
    value: string,
    set: (v: string) => void,
    multi = false,
    maxLength = 2000,
  ) => (
    <>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, multi && s.multi]}
        value={value}
        onChangeText={set}
        multiline={multi}
        maxLength={maxLength}
      />
    </>
  );
  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>{duplicate ? '複製新增就醫紀錄' : existing ? '編輯就醫紀錄' : '新增就醫紀錄'}</Text>
        <Text style={s.notice}>此處保存飼主取得的就醫資訊，不是正式動物醫院病歷。</Text>
        <DatePickerField
          label="就醫日期（必填）"
          value={visitedAt}
          mode="date"
          onChange={(date) => { const next = new Date(visitedAt); next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate()); next.setHours(12, 0, 0, 0); setVisitedAt(next); }}
        />
        {field('看診原因（必填）', reason, setReason, false, 500)}
        {field('動物醫院名稱（選填）', clinic, setClinic, false, 200)}
        {field('獸醫姓名（選填）', vet, setVet, false, 100)}
        {field('診斷／獸醫說明（選填）', vetNotes, setVetNotes, true)}
        {field('治療／用藥說明（選填）', treatment, setTreatment, true)}
        <DatePickerField
          label="下次回診日期（選填）"
          value={followUp || undefined}
          mode="datetime"
          minimumDate={visitedAt}
          onChange={setFollowUp}
        />
        {followUp && (
          <TouchableOpacity
            onPress={() => {
              setFollowUp(null);
              setCreateReminder(false);
            }}
          >
            <Text style={s.removeText}>清除回診日期</Text>
          </TouchableOpacity>
        )}
        {followUp && (
          <View style={s.switchRow}>
            <View>
              <Text style={s.switchText}>是否建立回診提醒？</Text>
              <Text style={s.helper}>關閉時會移除這筆就醫紀錄原有的回診提醒。</Text>
            </View>
            <Switch value={createReminder} onValueChange={setCreateReminder} />
          </View>
        )}
        <Text style={s.label}>費用（選填）</Text>
        <TextInput
          style={s.input}
          keyboardType="decimal-pad"
          value={cost}
          onChangeText={setCost}
          placeholder="0"
        />
        {field('備註（選填）', notes, setNotes, true)}
        <Text style={s.heading}>用藥紀錄（選填）</Text>
        <Text style={s.helper}>只有拿藥時才需要新增；不知道藥名可先查看藥袋或附上照片。</Text>
        {!medications.length && <Text style={s.empty}>目前沒有藥物</Text>}
        {medications.map((m, i) => (
          <View key={i} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>藥物 {i + 1}</Text>
              <TouchableOpacity onPress={() => removeMed(i)}>
                <Text style={s.removeText}>刪除</Text>
              </TouchableOpacity>
            </View>
            {field('藥袋／藥品名稱（新增用藥時必填）', m.name, (v) => updateMed(i, 'name', v), false, 100)}
            {field(
              '服用方式（選填）',
              m.instructions,
              (v) => updateMed(i, 'instructions', v),
              false,
              500,
            )}
            <Text style={s.label}>每日次數（選填）</Text>
            <TextInput
              style={s.input}
              keyboardType="number-pad"
              value={String(m.timesPerDay)}
              onChangeText={(v) => updateMed(i, 'timesPerDay', Number(v))}
            />
            <DatePickerField
              label="開始日期"
              value={m.startDate ? parseDate(m.startDate) : undefined}
              onChange={(date) => updateMed(i, 'startDate', localDate(date))}
            />
            <DatePickerField
              label="結束日期"
              value={m.endDate ? parseDate(m.endDate) : undefined}
              minimumDate={m.startDate ? parseDate(m.startDate) : undefined}
              onChange={(date) => updateMed(i, 'endDate', localDate(date))}
            />
            <Text style={s.label}>飯前／飯後（選填）</Text>
            <View style={s.mealRow}>
              {(
                [
                  ['before', '飯前'],
                  ['after', '飯後'],
                  ['any', '不限'],
                ] as const
              ).map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  style={[s.meal, m.mealTiming === value && s.mealActive]}
                  onPress={() => updateMed(i, 'mealTiming', value)}
                >
                  <Text style={s.inputText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {field('藥物備註（選填）', m.notes, (v) => updateMed(i, 'notes', v), true, 500)}
          </View>
        ))}
        <TouchableOpacity
          disabled={submitting}
          style={s.outline}
          onPress={() => setMedications((v) => [...v, emptyMedication()])}
        >
          <Text style={s.outlineText}>＋ 新增一筆用藥</Text>
        </TouchableOpacity>
        <AttachmentPicker
          userId={session!.userId}
          petId={existing?.petId || selectedPet!.id}
          sourceType="medical_visit"
          limit={ATTACHMENT_LIMITS.medical_visit}
          value={attachments}
          onChange={setAttachments}
          disabled={submitting}
        />
        <TouchableOpacity
          disabled={submitting}
          style={[s.submit, submitting && s.disabled]}
          onPress={submit}
        >
          <Text style={s.submitText}>{submitting ? '儲存中…' : '儲存就醫紀錄'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 60 },
  title: { color: Colors.text, fontSize: 26, fontWeight: '800' },
  notice: { color: Colors.subtext, lineHeight: 20, marginTop: 6 },
  label: { color: Colors.text, fontWeight: '700', marginTop: 14, marginBottom: 7 },
  input: {
    minHeight: 52,
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 13,
    paddingHorizontal: 13,
    color: Colors.text,
  },
  inputText: { color: Colors.text },
  multi: { height: 85, paddingTop: 12, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  switchText: { color: Colors.text, fontWeight: '700' },
  helper: { color: Colors.subtext, fontSize: 12, marginTop: 4, maxWidth: 280 },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meal: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mealActive: { backgroundColor: Colors.primary },
  heading: { color: Colors.text, fontSize: 19, fontWeight: '800', marginTop: 24, marginBottom: 4 },
  empty: { color: Colors.subtext, paddingVertical: 12 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: Colors.text, fontWeight: '800' },
  removeText: { color: '#C34D4D', fontWeight: '700', marginTop: 8 },
  outline: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  outlineText: { color: Colors.text, fontWeight: '700' },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  image: { width: 75, height: 75, borderRadius: 10 },
  removeImage: { color: '#C34D4D', fontSize: 12, textAlign: 'center', marginTop: 3 },
  submit: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 25,
  },
  submitText: { color: '#FFF', fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
