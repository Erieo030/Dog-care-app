import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import ScreenState from '../components/ScreenState';
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
  const group = (title: string, items: MedicationCourse[]) => (
    <>
      <Text style={s.section}>{title}</Text>
      {items.map((x) => (
        <TouchableOpacity
          key={x.id}
          style={s.card}
          onPress={() => nav.navigate('MedicationDetail', { recordId: x.id })}
        >
          <Text style={s.name}>{x.name}</Text>
          <Text>
            {x.startDate}
            {x.endDate ? ` ～ ${x.endDate}` : ''}
          </Text>
          <Text>
            每日 {x.timesPerDay} 次 · {meal[x.mealTiming]}
          </Text>
          <Text>{x.reminderEnabled ? '已設定提醒' : '未設定提醒'}</Text>
        </TouchableOpacity>
      ))}
    </>
  );
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>用藥管理</Text>
      {error ? (
        <TouchableOpacity onPress={load}>
          <Text style={s.error}>{error}（重試）</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={s.primary} onPress={() => nav.navigate('MedicationForm')}>
        <Text style={s.primaryText}>新增用藥療程</Text>
      </TouchableOpacity>
      {group('目前用藥', active)}
      {group('歷史用藥', history)}
      {!data.length ? <Text style={s.empty}>目前沒有用藥紀錄</Text> : null}
    </ScrollView>
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
  const [d, setD] = useState<MedicationDraft>(
    (existing ? { ...blank(), ...existing } : blank()) as MedicationDraft,
  );
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof MedicationDraft>(key: K, value: MedicationDraft[K]) =>
    setD((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (!session?.userId || !selectedPet || saving) return;
    if (!d.name?.trim()) {
      Alert.alert('請填寫藥名');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: d.name.trim(), instructions: d.instructions.trim(), timesPerDay: d.timesPerDay, startDate: d.startDate, endDate: d.endDate || '', mealTiming: d.mealTiming, notes: d.notes.trim(), status: d.status, reminderTimes: d.reminderTimes, reminderEnabled: d.reminderEnabled, medicalVisitId: typeof d.medicalVisitId === 'string' ? d.medicalVisitId : undefined };
      const r = existing
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
  const addTime = () => {
    const value = d.reminderTimeDraft || '08:00';
    if (!d.reminderTimes.includes(value)) set('reminderTimes', [...d.reminderTimes, value]);
    set('reminderEnabled', true);
  };
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>{existing ? '編輯用藥' : '新增用藥療程'}</Text>
      {[
        ['name', '藥名（必填）'],
        ['startDate', '開始日期 YYYY-MM-DD'],
        ['endDate', '結束日期 YYYY-MM-DD'],
        ['instructions', '使用說明'],
        ['timesPerDay', '每日次數 1～6'],
        ['notes', '備註'],
      ].map(([k, l]) => (
        <TextInput
          key={k}
          style={s.input}
          placeholder={l}
          value={String(d[k] ?? '')}
          keyboardType={k === 'timesPerDay' ? 'numeric' : 'default'}
          onChangeText={(v) => set(k, k === 'timesPerDay' ? Number(v) : v)}
        />
      ))}
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
      <TextInput
        style={s.input}
        placeholder="提醒時間 HH:MM（預設 08:00）"
        value={d.reminderTimeDraft || ''}
        onChangeText={(v) => set('reminderTimeDraft', v)}
      />
      <TouchableOpacity style={s.primary} onPress={addTime}>
        <Text style={s.primaryText}>新增提醒時間（目前 {d.reminderTimes.length} 筆）</Text>
      </TouchableOpacity>
      {d.reminderTimes.map((x: string) => (
        <Text key={x}>提醒：{x}</Text>
      ))}
      <TouchableOpacity style={s.primary} disabled={saving} onPress={save}>
        <Text style={s.primaryText}>{saving ? '儲存中…' : '儲存'}</Text>
      </TouchableOpacity>
      <Text style={s.notice}>PawLog 僅協助記錄用藥資訊與提醒，請依獸醫指示使用。</Text>
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
  page: { padding: 18, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  section: { fontSize: 18, fontWeight: '700', marginTop: 18 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    marginTop: 10,
    gap: 5,
  },
  name: { fontSize: 18, fontWeight: '700' },
  input: {
    borderWidth: 1,
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
    backgroundColor: '#3f8064',
    padding: 14,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    marginVertical: 10,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  empty: { padding: 24, textAlign: 'center' },
  error: { color: '#b42318' },
  action: { color: '#3f8064', textAlign: 'center', padding: 14 },
  delete: { color: '#b42318', textAlign: 'center', padding: 14 },
  notice: { color: '#666', marginTop: 14 },
});
