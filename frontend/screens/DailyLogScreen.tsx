import React, { useCallback, useEffect, useState } from 'react';
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import ScreenState from '../components/ScreenState';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import {
  createDailyLog,
  deleteDailyLog,
  getDailyLogs,
  getDailyLog,
  getTodayDailyLog,
  updateDailyLog,
} from '../services/dailyLogService';
import { DailyLog, DailyEnergyLevel, DailyPhysicalStatus, DailyWaterLevel } from '../types';
const water: [DailyWaterLevel, string][] = [
  ['very_low', '很少'],
  ['low', '偏少'],
  ['normal', '正常'],
  ['high', '偏多'],
  ['very_high', '很多'],
];
const energy: [DailyEnergyLevel, string][] = [
  ['very_energetic', '很有精神'],
  ['normal', '正常'],
  ['slightly_low', '稍微沒精神'],
  ['clearly_low', '明顯沒精神'],
  ['very_low', '很差'],
];
const physical: [DailyPhysicalStatus, string][] = [
  ['normal', '正常'],
  ['heat', '發情'],
  ['period', '生理期'],
  ['post_surgery', '術後'],
  ['pregnant', '懷孕'],
  ['other', '其他'],
];
const dateKey = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};
type Props = NativeStackScreenProps<HomeStackParamList, 'DailyLog'>;
export default function DailyLogScreen({ route }: Props) {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [record, setRecord] = useState<DailyLog | null>(null);
  const [history, setHistory] = useState<DailyLog[]>([]);
  const [draft, setDraft] = useState<Partial<DailyLog>>({
    localDate: dateKey(),
    loggedAt: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.userId || !selectedPet) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [today, list] = await Promise.all([
        route.params?.recordId
          ? getDailyLog(session.userId, route.params.recordId)
          : getTodayDailyLog(session.userId, selectedPet.id),
        getDailyLogs(session.userId, selectedPet.id),
      ]);
      const selectedRecord = route.params?.recordId
        ? list.records.find((item) => item.id === route.params?.recordId) ??
          (route.params.recordDate
            ? list.records.find((item) => item.localDate === route.params?.recordDate?.slice(0, 10)) ?? null
            : null)
        : today.record;
      setRecord(selectedRecord);
      setDraft(selectedRecord || { localDate: dateKey(), loggedAt: new Date().toISOString() });
      setHistory(list.records);
    } catch (e) {
      setError((e as Error).message || '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [session?.userId, selectedPet, route.params?.recordId, route.params?.recordDate]);
  useEffect(() => {
    load();
  }, [load]);
  const set = (k: keyof DailyLog, v: string | boolean | number | undefined) =>
    setDraft((x) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!session?.userId || !selectedPet || saving) return;
    setSaving(true);
    try {
      const data = {
        ...draft,
        localDate: draft.localDate || dateKey(),
        loggedAt: draft.loggedAt || new Date().toISOString(),
      };
      if (record) await updateDailyLog(session.userId, record.id, data);
      else await createDailyLog(session.userId, selectedPet.id, data);
      Alert.alert('已儲存', '今日紀錄已更新');
      await load();
    } catch (e) {
      setError((e as Error).message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };
  const remove = () => {
    if (!record || !session?.userId) return;
    Alert.alert('刪除紀錄', '確定刪除這筆日常紀錄？', [
      { text: '取消' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          await deleteDailyLog(session.userId, record.id);
          setRecord(null);
          setDraft({ localDate: dateKey(), loggedAt: new Date().toISOString() });
          await load();
        },
      },
    ]);
  };
  if (loading) return <ScreenState loading text="載入中…" />;
  return (
    <ScrollView contentContainerStyle={s.page}>
      {error ? (
        <TouchableOpacity onPress={load}>
          <Text style={s.error}>{error}（點擊重試）</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={s.label}>喝水量</Text>
      <Options values={water} value={draft.waterLevel} onPick={(v) => set('waterLevel', v)} />
      <Text style={s.label}>飼料量</Text>
      <Options values={water} value={draft.foodLevel} onPick={(v) => set('foodLevel', v)} />
      <Text style={s.label}>今天有吃零食嗎？</Text>
      <Options
        values={
          [
            [false, '沒有'],
            [true, '有'],
          ] as [boolean, string][]
        }
        value={draft.snack}
        onPick={(v) => set('snack', v)}
      />
      {draft.snack ? (
        <TextInput
          style={s.input}
          placeholder="零食名稱"
          value={draft.snackName || ''}
          onChangeText={(v) => set('snackName', v)}
        />
      ) : null}
      <Text style={s.label}>精神狀態</Text>
      <Options values={energy} value={draft.energyLevel} onPick={(v) => set('energyLevel', v)} />
      <Text style={s.label}>生理狀態</Text>
      <Options
        values={physical}
        value={draft.physicalStatus}
        onPick={(v) => set('physicalStatus', v)}
      />
      <Text style={s.label}>大便狀況</Text>
      <Options
        values={
          [
            [1, '1 很硬'],
            [2, '2 偏硬'],
            [3, '3 正常'],
            [4, '4 偏軟'],
            [5, '5 水狀'],
          ] as [number, string][]
        }
        value={draft.stoolLevel}
        onPick={(v) => set('stoolLevel', v)}
      />
      <TextInput
        style={[s.input, s.notes]}
        multiline
        placeholder="備註"
        value={draft.notes || ''}
        onChangeText={(v) => set('notes', v)}
      />
      <TouchableOpacity style={s.save} disabled={saving} onPress={save}>
        <Text style={s.saveText}>{saving ? '儲存中…' : '儲存今日紀錄'}</Text>
      </TouchableOpacity>
      {record ? (
        <TouchableOpacity onPress={remove}>
          <Text style={s.delete}>刪除今日紀錄</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={[s.label, s.historyHeading]}>過往紀錄</Text>
      {history.map((x) => (
        <TouchableOpacity
          key={x.id}
          style={s.row}
          onPress={() => {
            setRecord(x);
            setDraft(x);
          }}
        >
          <View style={s.historyDate}>
            <Ionicons name="calendar-outline" size={17} color={Colors.primary} />
            <Text style={s.historyDateText}>{x.localDate}</Text>
          </View>
          <Text style={s.historyNote} numberOfLines={1}>{x.notes || '已記錄觀察項目'}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
function Options({
  values,
  value,
  onPick,
}: {
  values: [string | boolean | number, string][];
  value: string | boolean | number | undefined;
  onPick: (v: string | boolean | number) => void;
}) {
  return (
    <View style={s.options}>
      {values.map(([v, l]) => (
        <TouchableOpacity
          key={String(v)}
          style={[s.chip, value === v && s.selected]}
          onPress={() => onPick(v)}
        >
          <Text>{l}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  page: { padding: 18, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 14, color: Colors.text },
  label: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8, color: Colors.text },
  historyHeading: { marginTop: 24, marginBottom: 10 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: Colors.successSoft,
  },
  selected: { backgroundColor: Colors.primarySoft },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    minHeight: 52,
    marginTop: 8,
  },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  save: {
    marginTop: 22,
    backgroundColor: Colors.primary,
    padding: 14,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
  error: { color: Colors.danger, marginBottom: 8 },
  delete: { color: Colors.danger, textAlign: 'center', margin: 18 },
  row: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyDate: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  historyDateText: { color: Colors.text, fontWeight: '700' },
  historyNote: { flex: 1, color: Colors.subtext, textAlign: 'right' },
});
