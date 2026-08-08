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
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import {
  createDailyLog,
  deleteDailyLog,
  getDailyLogs,
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
const dateKey = () => new Date().toISOString().slice(0, 10);
export default function DailyLogScreen() {
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
        getTodayDailyLog(session.userId, selectedPet.id),
        getDailyLogs(session.userId, selectedPet.id),
      ]);
      setRecord(today.record);
      setDraft(today.record || { localDate: dateKey(), loggedAt: new Date().toISOString() });
      setHistory(list.records);
    } catch (e) {
      setError((e as Error).message || '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [session?.userId, selectedPet]);
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
  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator />
      </View>
    );
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>今日紀錄</Text>
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
          placeholder="零食名稱（選填）"
          value={draft.snackName || ''}
          onChangeText={(v) => set('snackName', v)}
        />
      ) : null}
      <Text style={s.label}>精神狀態</Text>
      <Options values={energy} value={draft.energyLevel} onPick={(v) => set('energyLevel', v)} />
      <Text style={s.label}>生理狀態（選填）</Text>
      <Options
        values={physical}
        value={draft.physicalStatus}
        onPick={(v) => set('physicalStatus', v)}
      />
      <Text style={s.label}>大便狀況（選填）</Text>
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
        placeholder="備註（選填）"
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
      <Text style={s.label}>歷史紀錄</Text>
      {history.map((x) => (
        <TouchableOpacity
          key={x.id}
          style={s.row}
          onPress={() => {
            setRecord(x);
            setDraft(x);
          }}
        >
          <Text>{x.localDate}</Text>
          <Text>{x.notes || '已記錄觀察項目'}</Text>
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
  title: { fontSize: 24, fontWeight: '700', marginBottom: 14 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  selected: { backgroundColor: '#b9e5d0' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    minHeight: 52,
    marginTop: 8,
  },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  save: {
    marginTop: 22,
    backgroundColor: '#3f8064',
    padding: 14,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
  error: { color: '#b42318', marginBottom: 8 },
  delete: { color: '#b42318', textAlign: 'center', margin: 18 },
  row: {
    minHeight: 52,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
