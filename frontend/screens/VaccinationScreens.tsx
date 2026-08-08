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
  createVaccination,
  deleteVaccination,
  getVaccination,
  getVaccinations,
  updateVaccination,
} from '../services/vaccinationService';
import { Vaccination } from '../types';
const empty = () => ({
  vaccineName: '',
  administeredAt: new Date().toISOString(),
  hospitalName: '',
  veterinarianName: '',
  batchNumber: '',
  manufacturer: '',
  nextDueAt: '',
  notes: '',
  createReminder: false,
});
export function VaccinationListScreen() {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const nav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [data, setData] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.userId || !selectedPet) return;
    setLoading(true);
    try {
      setData((await getVaccinations(session.userId, selectedPet.id)).records);
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
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>疫苗紀錄</Text>
      {error ? (
        <TouchableOpacity onPress={load}>
          <Text style={s.error}>{error}（重試）</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={s.primary} onPress={() => nav.navigate('VaccinationForm')}>
        <Text style={s.primaryText}>新增疫苗紀錄</Text>
      </TouchableOpacity>
      {!data.length ? (
        <Text style={s.empty}>目前沒有疫苗紀錄</Text>
      ) : (
        data.map((x) => (
          <TouchableOpacity
            key={x.id}
            style={s.card}
            onPress={() => nav.navigate('VaccinationDetail', { recordId: x.id })}
          >
            <Text style={s.name}>{x.vaccineName}</Text>
            <Text>接種日期：{new Date(x.administeredAt).toLocaleDateString('zh-TW')}</Text>
            <Text>醫院：{x.hospitalName || '未填寫醫院'}</Text>
            {x.nextDueAt ? (
              <Text>下次接種：{new Date(x.nextDueAt).toLocaleDateString('zh-TW')}</Text>
            ) : null}
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}
export function VaccinationFormScreen() {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const route = useRoute<RouteProp<HomeStackParamList, 'VaccinationForm'>>();
  const nav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const existing = route.params?.record as Vaccination | undefined;
  const [d, setD] = useState<any>(existing || empty());
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setD((x: any) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!session?.userId || !selectedPet || saving) return;
    if (!d.vaccineName.trim()) {
      Alert.alert('請填寫疫苗名稱');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...d, nextDueAt: d.nextDueAt || null };
      const r = existing
        ? await updateVaccination(session.userId, existing.id, payload)
        : await createVaccination(session.userId, selectedPet.id, payload);
      Alert.alert('已儲存', '疫苗紀錄已更新');
      nav.replace('VaccinationDetail', { recordId: r.record.id });
    } catch (e) {
      Alert.alert('儲存失敗', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>{existing ? '編輯疫苗' : '新增疫苗'}</Text>
      {[
        ['vaccineName', '疫苗名稱（必填）'],
        ['administeredAt', '接種日期 ISO（必填）'],
        ['hospitalName', '醫院'],
        ['veterinarianName', '獸醫'],
        ['batchNumber', '批號'],
        ['manufacturer', '廠牌'],
        ['nextDueAt', '下次接種日期 ISO'],
        ['notes', '備註'],
      ].map(([k, l]) => (
        <TextInput
          key={k}
          style={s.input}
          placeholder={l}
          value={d[k] || ''}
          onChangeText={(v) => set(k, k === 'administeredAt' || k === 'nextDueAt' ? v : v)}
        />
      ))}
      <TouchableOpacity style={s.check} onPress={() => set('createReminder', !d.createReminder)}>
        <Text>{d.createReminder ? '☑' : '□'} 是否建立下次疫苗提醒？</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.primary} disabled={saving} onPress={save}>
        <Text style={s.primaryText}>{saving ? '儲存中…' : '儲存'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
export function VaccinationDetailScreen() {
  const { session } = useAuth();
  const route = useRoute<RouteProp<HomeStackParamList, 'VaccinationDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [record, setRecord] = useState<Vaccination | null>(null);
  useEffect(() => {
    if (session?.userId && route.params?.recordId)
      getVaccination(session.userId, route.params.recordId)
        .then((x) => setRecord(x.record))
        .catch(() => undefined);
  }, [session?.userId, route.params?.recordId]);
  if (!record)
    return (
      <View style={s.center}>
        <ActivityIndicator />
      </View>
    );
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>{record.vaccineName}</Text>
      <Text>接種日期：{new Date(record.administeredAt).toLocaleDateString('zh-TW')}</Text>
      <Text>醫院：{record.hospitalName || '未填寫'}</Text>
      <Text>獸醫：{record.veterinarianName || '未填寫'}</Text>
      <Text>批號：{record.batchNumber || '未填寫'}</Text>
      <Text>廠牌：{record.manufacturer || '未填寫'}</Text>
      <Text>備註：{record.notes || '未填寫'}</Text>
      {record.nextDueAt ? (
        <Text>下次接種：{new Date(record.nextDueAt).toLocaleDateString('zh-TW')}</Text>
      ) : null}
      <TouchableOpacity
        style={s.primary}
        onPress={() => nav.navigate('VaccinationForm', { record })}
      >
        <Text style={s.primaryText}>編輯</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() =>
          Alert.alert('刪除疫苗', '確定刪除？', [
            { text: '取消' },
            {
              text: '刪除',
              style: 'destructive',
              onPress: async () => {
                if (session?.userId) {
                  await deleteVaccination(session.userId, record.id);
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
  page: { padding: 18, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    marginTop: 12,
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
  check: { padding: 12, minHeight: 44, justifyContent: 'center' },
  delete: { color: '#b42318', textAlign: 'center', margin: 20 },
});
