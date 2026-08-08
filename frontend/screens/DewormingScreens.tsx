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
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import type { HomeStackParamList } from '../navigation/types';
import {
  createDeworming,
  deleteDeworming,
  getDeworming,
  getDewormings,
  updateDeworming,
} from '../services/dewormingService';
import { Deworming, DewormingType } from '../types';
const labels: Record<DewormingType, string> = {
  internal: '體內驅蟲',
  external: '體外驅蟲',
  heartworm: '心絲蟲預防',
  other: '其他',
};
const blank = () => ({
  type: 'internal',
  productName: '',
  administeredAt: new Date().toISOString(),
  nextDueAt: '',
  notes: '',
  manufacturer: '',
  dosageText: '',
  administrationMethod: '',
  hospitalName: '',
  veterinarianName: '',
  createReminder: false,
});
export function DewormingListScreen() {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const nav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [data, setData] = useState<Deworming[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.userId || !selectedPet) return;
    setLoading(true);
    try {
      setData((await getDewormings(session.userId, selectedPet.id)).records);
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
  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator />
      </View>
    );
  return (
    <ScrollView contentContainerStyle={s.page} onScrollBeginDrag={() => undefined}>
      <Text style={s.title}>驅蟲紀錄</Text>
      {error ? (
        <TouchableOpacity onPress={load}>
          <Text style={s.error}>{error}（重試）</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={s.primary} onPress={() => nav.navigate('DewormingForm')}>
        <Text style={s.primaryText}>新增驅蟲紀錄</Text>
      </TouchableOpacity>
      {!data.length ? (
        <Text style={s.empty}>目前沒有驅蟲紀錄</Text>
      ) : (
        data.map((x) => (
          <TouchableOpacity
            key={x.id}
            style={s.card}
            onPress={() => nav.navigate('DewormingDetail', { recordId: x.id })}
          >
            <Text style={s.name}>{labels[x.type]}</Text>
            <Text>{x.productName}</Text>
            <Text>使用日期：{new Date(x.administeredAt).toLocaleDateString('zh-TW')}</Text>
            {x.nextDueAt ? (
              <Text>下次：{new Date(x.nextDueAt).toLocaleDateString('zh-TW')}</Text>
            ) : null}
            <Text>{x.reminderId ? '已建立提醒' : '未建立提醒'}</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}
export function DewormingFormScreen() {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const route = useRoute<RouteProp<HomeStackParamList, 'DewormingForm'>>();
  const nav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const existing = route.params?.record as Deworming | undefined;
  const [d, setD] = useState<Partial<Deworming>>(existing || blank());
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Deworming, v: Partial<Deworming>[keyof Partial<Deworming>]) =>
    setD((x) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!session?.userId || !selectedPet || saving) return;
    if (!d.productName.trim()) {
      Alert.alert('請填寫產品名稱');
      return;
    }
    setSaving(true);
    try {
      const r = existing
        ? await updateDeworming(session.userId, existing.id, {
            ...d,
            nextDueAt: d.nextDueAt || null,
          })
        : await createDeworming(session.userId, selectedPet.id, {
            ...d,
            nextDueAt: d.nextDueAt || null,
          });
      Alert.alert('已儲存', '驅蟲紀錄已更新');
      nav.replace('DewormingDetail', { recordId: r.record.id });
    } catch (e) {
      Alert.alert('儲存失敗', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>{existing ? '編輯驅蟲紀錄' : '新增驅蟲紀錄'}</Text>
      <View style={s.options}>
        {(Object.keys(labels) as DewormingType[]).map((k) => (
          <TouchableOpacity
            key={k}
            style={[s.chip, d.type === k && s.selected]}
            onPress={() => set('type', k)}
          >
            <Text>{labels[k]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {[
        ['productName', '產品／藥品名稱（必填）'],
        ['administeredAt', '使用日期 ISO（必填）'],
        ['nextDueAt', '下次日期 ISO'],
        ['manufacturer', '廠牌（選填）'],
        ['dosageText', '劑量文字（選填）'],
        ['administrationMethod', '使用方式（選填）'],
        ['hospitalName', '醫院（選填）'],
        ['veterinarianName', '獸醫（選填）'],
        ['notes', '備註（選填）'],
      ].map(([k, l]) => (
        <TextInput
          key={k}
          style={s.input}
          placeholder={l}
          value={d[k] || ''}
          onChangeText={(v) => set(k, v)}
        />
      ))}
      <TouchableOpacity onPress={() => set('createReminder', !d.createReminder)}>
        <Text style={s.check}>{d.createReminder ? '☑' : '□'} 是否建立下次驅蟲提醒？</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.primary} disabled={saving} onPress={save}>
        <Text style={s.primaryText}>{saving ? '儲存中…' : '儲存'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
export function DewormingDetailScreen() {
  const { session } = useAuth();
  const route = useRoute<RouteProp<HomeStackParamList, 'DewormingDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [r, setR] = useState<Deworming | null>(null);
  useEffect(() => {
    if (session?.userId && route.params?.recordId)
      getDeworming(session.userId, route.params.recordId)
        .then((x) => setR(x.record))
        .catch(() => undefined);
  }, [session?.userId, route.params?.recordId]);
  if (!r)
    return (
      <View style={s.center}>
        <ActivityIndicator />
      </View>
    );
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>{labels[r.type]}</Text>
      <Text>產品：{r.productName}</Text>
      <Text>使用日期：{new Date(r.administeredAt).toLocaleDateString('zh-TW')}</Text>
      {r.nextDueAt ? <Text>下次：{new Date(r.nextDueAt).toLocaleDateString('zh-TW')}</Text> : null}
      <Text>劑量：{r.dosageText || '未填寫'}</Text>
      <Text>使用方式：{r.administrationMethod || '未填寫'}</Text>
      <Text>醫院：{r.hospitalName || '未填寫'}</Text>
      <Text>獸醫：{r.veterinarianName || '未填寫'}</Text>
      <Text>備註：{r.notes || '未填寫'}</Text>
      <Text>提醒：{r.reminderId ? '已建立' : '未建立'}</Text>
      <TouchableOpacity
        style={s.primary}
        onPress={() => nav.navigate('DewormingForm', { record: r })}
      >
        <Text style={s.primaryText}>編輯</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() =>
          Alert.alert('刪除驅蟲紀錄', '確定要刪除嗎？', [
            { text: '取消' },
            {
              text: '刪除',
              style: 'destructive',
              onPress: async () => {
                if (session?.userId) {
                  await deleteDeworming(session.userId, r.id);
                  nav.goBack();
                }
              },
            },
          ])
        }
      >
        <Text style={s.delete}>刪除</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginTop: 12,
    gap: 5,
  },
  name: { fontSize: 18, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 10 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { padding: 11, borderRadius: 18, backgroundColor: '#eee' },
  selected: { backgroundColor: '#b9e5d0' },
  primary: {
    backgroundColor: '#3f8064',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  empty: { padding: 24, textAlign: 'center' },
  error: { color: '#b42318' },
  check: { padding: 12 },
  delete: { color: '#b42318', textAlign: 'center', margin: 20 },
});
