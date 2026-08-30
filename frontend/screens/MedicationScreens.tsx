import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import ScreenState from '../components/ScreenState';
import DatePickerField from '../components/DatePickerField';

const timeValue = (value?: string) => {
  const [hour, minute] = (value || '08:00').split(':').map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(hour) ? hour : 8, Number.isFinite(minute) ? minute : 0, 0, 0);
  return date;
};
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import type { HomeStackParamList } from '../navigation/types';
import {
  completeMedication,
  createMedication,
  deleteMedication,
  getMedication,
  getMedications,
  stopMedication,
  updateMedication,
} from '../services/medicationService';
import { MedicationCourse, MedicationMealTiming } from '../types';
const meal: Record<MedicationMealTiming, string> = {
  before_meal: '飯前',
  after_meal: '飯後',
  anytime: '不限',
};
const blank = () => ({
  name: '',
  instructions: '',
  timesPerDay: 1,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  mealTiming: 'anytime',
  notes: '',
  status: 'active',
  reminderEnabled: false,
  reminderTimes: [] as string[],
  reminderTimeDraft: '',
});
export function MedicationListScreen() {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const nav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [data, setData] = useState<MedicationCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.userId || !selectedPet) return;
    setLoading(true);
    try {
      setData((await getMedications(session.userId, selectedPet.id)).records);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [session?.userId, selectedPet]);
  useEffect(() => {
    load();
  }, [load]);
  if (loading) return <ScreenState loading text="載入中…" />;
  const active = data.filter((x) => x.status === 'active'),
    history = data.filter((x) => x.status !== 'active');
  type ListEntry =
    | { kind: 'section'; id: string; title: string }
    | { kind: 'item'; id: string; item: MedicationCourse };
  const listData: ListEntry[] = [
    ...(active.length ? [{ kind: 'section' as const, id: 'active-section', title: '目前用藥' }, ...active.map((item) => ({ kind: 'item' as const, id: `active-${item.id}`, item }))] : []),
    ...(history.length ? [{ kind: 'section' as const, id: 'history-section', title: '歷史用藥' }, ...history.map((item) => ({ kind: 'item' as const, id: `history-${item.id}`, item }))] : []),
  ];
  return (
    <FlatList
      data={listData}
      keyExtractor={(entry) => entry.id}
      removeClippedSubviews
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      contentContainerStyle={s.page}
      ListHeaderComponent={<>
        <View style={s.listHeader}><View style={s.listHeaderIcon}><Ionicons name="medical-outline" size={23} color={Colors.success} /></View><View style={s.listHeaderBody}><Text style={s.title}>用藥管理</Text><Text style={s.listSubtitle}>整理 {selectedPet?.name || '毛孩'} 的療程與提醒</Text></View></View>
        {error ? <TouchableOpacity onPress={load}><Text style={s.error}>{error}（重試）</Text></TouchableOpacity> : null}
        <TouchableOpacity style={s.primary} onPress={() => nav.navigate('MedicationForm')}><Ionicons name="add" size={20} color="#FFF" /><Text style={s.primaryText}>新增用藥療程</Text></TouchableOpacity>
        {!data.length ? <View style={s.emptyBox}><View style={s.emptyIcon}><Ionicons name="medical-outline" size={27} color={Colors.success} /></View><Text style={s.empty}>目前沒有用藥紀錄</Text><Text style={s.emptyHint}>需要時再新增，讓 MEGO 幫你整理療程。</Text></View> : null}
      </>}
      renderItem={({ item: entry }) => {
        if (entry.kind === 'section') return <Text style={s.section}>{entry.title}</Text>;
        const x = entry.item;
        return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`查看用藥：${x.name}`} style={s.card} onPress={() => nav.navigate('MedicationDetail', { recordId: x.id })}>
          <View style={s.cardTitleRow}><View style={s.cardIcon}><Ionicons name="medical-outline" size={18} color={Colors.success} /></View><Text style={s.name}>{x.name}</Text><Ionicons name="chevron-forward" size={17} color={Colors.subtext} /></View>
          <Text style={s.cardText}>{x.startDate}{x.endDate ? ` ～ ${x.endDate}` : ''}</Text>
          <Text style={s.cardText}>每日 {x.timesPerDay} 次 · {meal[x.mealTiming]}</Text>
          <Text style={s.cardHint}>{x.reminderEnabled ? '已設定提醒' : '尚未設定提醒'}</Text>
        </TouchableOpacity>;
      }}
    />
  );
}
type MedicationDraft = {
  name: string;
  instructions: string;
  timesPerDay: number;
  startDate: string;
  endDate: string;
  mealTiming: MedicationMealTiming;
  notes: string;
  status: MedicationCourse['status'];
  reminderEnabled: boolean;
  reminderTimes: string[];
  reminderTimeDraft: string;
  [key: string]: string | number | boolean | string[] | MedicationCourse['status'];
};

export function MedicationFormScreen() {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const route = useRoute<RouteProp<HomeStackParamList, 'MedicationForm'>>();
  const nav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const existing = route.params?.record as MedicationCourse | undefined;
  const duplicate = route.params?.duplicate === true;
  const [d, setD] = useState<MedicationDraft>(
    (existing ? { ...blank(), ...existing } : blank()) as MedicationDraft,
  );
  const [saving, setSaving] = useState(false);
  const [editingReminderTime, setEditingReminderTime] = useState<string | null>(null);
  const set = <K extends keyof MedicationDraft>(key: K, value: MedicationDraft[K]) =>
    setD((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (!session?.userId || !selectedPet || saving) return;
    if (!d.name?.trim()) {
      Alert.alert('請填寫藥名');
      return;
    }
    if (d.startDate && d.endDate && d.endDate < d.startDate) {
      Alert.alert('日期順序錯誤', '結束日期不能早於開始日期。');
      return;
    }
    const reminderTime = d.reminderTimeDraft.trim();
    if (reminderTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) {
      Alert.alert('提醒時間格式錯誤', '請使用 HH:MM，例如 08:00');
      return;
    }
    let reminderTimes = d.reminderTimes;
    if (reminderTime) {
      reminderTimes = editingReminderTime
        ? reminderTimes.map((item) => item === editingReminderTime ? reminderTime : item)
        : reminderTimes.includes(reminderTime) ? reminderTimes : [...reminderTimes, reminderTime];
    }
    reminderTimes = [...new Set(reminderTimes)];
    setSaving(true);
    try {
      const payload = { name: d.name.trim(), instructions: d.instructions.trim(), timesPerDay: d.timesPerDay, startDate: d.startDate, endDate: d.endDate || '', mealTiming: d.mealTiming, notes: d.notes.trim(), status: d.status, reminderTimes, reminderEnabled: reminderTimes.length > 0, medicalVisitId: typeof d.medicalVisitId === 'string' ? d.medicalVisitId : undefined };
      const r = existing && !duplicate
        ? await updateMedication(session.userId, existing.id, payload)
        : await createMedication(session.userId, selectedPet.id, payload);
      Alert.alert('已儲存', '用藥紀錄已更新');
      nav.replace('MedicationDetail', { recordId: r.record.id });
    } catch (e) {
      Alert.alert('儲存失敗', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>{existing ? '編輯用藥' : '新增用藥療程'}</Text>
      {[
        ['name', '藥品名稱（必填）'],
        ['startDate', '開始日期（必填）'],
        ['endDate', '結束日期（選填）'],
        ['instructions', '使用說明／每次用量（選填）'],
        ['timesPerDay', '每日次數（必填）'],
        ['notes', '備註'],
      ].map(([k, l]) => {
        const isDate = k === 'startDate' || k === 'endDate';
        if (isDate) return (
          <DatePickerField key={k} label={l} value={d[k] ? new Date(`${d[k]}T12:00:00`) : undefined}
            onChange={(date) => set(k, date.toISOString().slice(0, 10))} minimumDate={k === 'endDate' && d.startDate ? new Date(`${d.startDate}T12:00:00`) : undefined} maximumDate={k === 'startDate' ? new Date() : undefined} />
        );
        return (<View key={k}><Text style={s.label}>{l}</Text><TextInput style={s.input} placeholder={`請輸入${l.replace('（必填）', '')}`} placeholderTextColor="#8A817B" value={String(d[k] ?? '')} keyboardType={k === 'timesPerDay' ? 'numeric' : 'default'} onChangeText={(v) => set(k, k === 'timesPerDay' ? Number(v) : v)} /></View>);
      })}
      <Text style={s.section}>服用方式</Text>
      <View style={s.options}>
        {(Object.keys(meal) as MedicationMealTiming[]).map((k) => (
          <TouchableOpacity
            key={k}
            style={[s.chip, d.mealTiming === k && s.selected]}
            onPress={() => set('mealTiming', k)}
          >
            <Text>{meal[k]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.label}>每天提醒時間（選填）</Text>
      <DatePickerField
        label="新增提醒時間"
        mode="time"
        value={timeValue(d.reminderTimeDraft || d.reminderTimes[0])}
        onChange={(date) => {
          const next = date.toTimeString().slice(0, 5);
          set('reminderTimeDraft', next);
          if (editingReminderTime) {
            set('reminderTimes', d.reminderTimes.map((item) => item === editingReminderTime ? next : item));
            setEditingReminderTime(null);
          }
        }}
      />
      {d.reminderTimes.map((time) => (
        <View key={time} style={s.reminderRow}>
          <Text style={s.reminderHint}>每天 {time}</Text>
          <TouchableOpacity onPress={() => { setEditingReminderTime(time); set('reminderTimeDraft', time); }}><Text style={s.action}>編輯</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => set('reminderTimes', d.reminderTimes.filter((item) => item !== time))}><Text style={s.delete}>刪除</Text></TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={s.primary} disabled={saving} onPress={save}>
        <Text style={s.primaryText}>{saving ? '儲存中…' : '儲存'}</Text>
      </TouchableOpacity>
      <Text style={s.notice}>MEGO 僅協助記錄用藥資訊與提醒，請依獸醫指示使用。</Text>
    </ScrollView>
  );
}
export function MedicationDetailScreen() {
  const { session } = useAuth();
  const route = useRoute<RouteProp<HomeStackParamList, 'MedicationDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [r, setR] = useState<MedicationCourse | null>(null);
  useEffect(() => {
    if (session?.userId && route.params?.recordId)
      getMedication(session.userId, route.params.recordId)
        .then((x) => setR(x.record))
        .catch(() => undefined);
  }, [session?.userId, route.params?.recordId]);
  if (!r)
    return (
      <View style={s.center}>
        <ActivityIndicator />
      </View>
    );
  const action = (fn: (u: string, id: string) => Promise<unknown>, label: string) =>
    Alert.alert(label, `確定要${label}嗎？`, [
      { text: '取消' },
      {
        text: '確定',
        onPress: async () => {
          if (session?.userId) {
            await fn(session.userId, r.id);
            nav.goBack();
          }
        },
      },
    ]);
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>{r.name}</Text>
      <Text>使用說明：{r.instructions || '未填寫'}</Text>
      <Text>每日次數：{r.timesPerDay}</Text>
      <Text>
        療程：{r.startDate}
        {r.endDate ? ` ～ ${r.endDate}` : ''}
      </Text>
      <Text>用餐時間：{meal[r.mealTiming]}</Text>
      <Text>
        狀態：{r.status === 'active' ? '服用中' : r.status === 'completed' ? '已完成' : '已停止'}
      </Text>
      <Text>提醒時間：{r.reminderTimes.join('、') || '未設定'}</Text>
      <Text>備註：{r.notes || '未填寫'}</Text>
      <TouchableOpacity
        style={s.primary}
        onPress={() => nav.navigate('MedicationForm', { record: r })}
      >
        <Text style={s.primaryText}>編輯</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.secondary} onPress={() => nav.navigate('MedicationForm', { record: r, duplicate: true })}>
        <Text style={s.secondaryText}>複製新增</Text>
      </TouchableOpacity>
      {r.status === 'active' ? (
        <>
          <TouchableOpacity onPress={() => action(completeMedication, '完成療程')}>
            <Text style={s.action}>完成療程</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => action(stopMedication, '停止療程')}>
            <Text style={s.action}>停止療程</Text>
          </TouchableOpacity>
        </>
      ) : null}
      <TouchableOpacity onPress={() => action(deleteMedication, '刪除用藥紀錄')}>
        <Text style={s.delete}>刪除</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  emptyBox: { alignItems: 'center', paddingVertical: 28 },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyHint: { color: '#887A6D', fontSize: 13, marginTop: 6, textAlign: 'center' },
  page: { padding: 18, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 }, listHeaderIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, listHeaderBody: { flex: 1 }, listSubtitle: { color: Colors.subtext, fontSize: 13, marginTop: 3 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  section: { fontSize: 16, fontWeight: '800', color: '#3F8064', marginTop: 14, marginBottom: 8 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    marginTop: 10,
    gap: 5,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 }, cardIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  name: { flex: 1, color: Colors.text, fontSize: 18, fontWeight: '700' }, cardText: { color: Colors.text, lineHeight: 20 }, cardHint: { color: Colors.subtext, fontSize: 12 },
  label: { color: '#3B4A43', fontSize: 14, fontWeight: '800', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#FFFFFF', color: '#2F3A34', borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    minHeight: 52,
    marginBottom: 10,
  },
  options: { flexDirection: 'row', gap: 8, marginVertical: 10 },
  chip: {
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  selected: { backgroundColor: '#b9e5d0' },
  primary: {
    flexDirection: 'row', gap: 7, justifyContent: 'center', backgroundColor: Colors.primary,
    padding: 14,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    marginVertical: 10,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  empty: { color: Colors.text, fontWeight: '700', textAlign: 'center' },
  error: { color: '#b42318' },
  action: { color: '#3f8064', textAlign: 'center', padding: 14 },
  secondary: { borderWidth: 1, borderColor: '#3f8064', borderRadius: 14, minHeight: 48, padding: 12, alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  secondaryText: { color: '#3f8064', fontWeight: '700' },
  delete: { color: '#b42318', textAlign: 'center', padding: 14 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  reminderHint: { color: '#6A5A50', flex: 1 },
  notice: { color: '#666', marginTop: 14 },
});
