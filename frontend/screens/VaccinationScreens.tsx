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
const validDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) || date.getFullYear() < 2000 ? undefined : date;
};
const empty = () => ({
  vaccineName: '',
  administeredAt: new Date().toISOString(),
  hospitalName: '',
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
  if (loading) return <ScreenState loading text="載入中…" />;
  return (
    <FlatList
      data={data}
      keyExtractor={(x) => x.id}
      removeClippedSubviews
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      contentContainerStyle={s.page}
      ListHeaderComponent={<>
        <View style={s.listHeader}><View style={s.listHeaderIcon}><Ionicons name="medkit-outline" size={23} color={Colors.success} /></View><View style={s.listHeaderBody}><Text style={s.title}>疫苗紀錄</Text><Text style={s.listSubtitle}>查看 {selectedPet?.name || '毛孩'} 的接種與下次日期</Text></View></View>
        {error ? <TouchableOpacity onPress={load}><Text style={s.error}>{error}（重試）</Text></TouchableOpacity> : null}
        <TouchableOpacity style={s.primary} onPress={() => nav.navigate('VaccinationForm')}><Ionicons name="add" size={20} color="#FFF" /><Text style={s.primaryText}>新增疫苗紀錄</Text></TouchableOpacity>
        {!data.length ? <View style={s.emptyBox}><View style={s.emptyIcon}><Ionicons name="medkit-outline" size={27} color={Colors.success} /></View><Text style={s.empty}>目前沒有疫苗紀錄</Text><Text style={s.emptyHint}>完成接種後，在這裡留下日期與下次提醒。</Text></View> : null}
      </>}
      renderItem={({ item: x }) => (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`查看疫苗紀錄：${x.vaccineName || '未填寫'}`} style={s.card} onPress={() => nav.navigate('VaccinationDetail', { recordId: x.id })}>
            <View style={s.cardTitleRow}><View style={s.cardIcon}><Ionicons name="medkit-outline" size={18} color={Colors.success} /></View><Text style={s.name}>{x.vaccineName}</Text><Ionicons name="chevron-forward" size={17} color={Colors.subtext} /></View>
            <Text style={s.cardText}>接種日期：{new Date(x.administeredAt).toLocaleDateString('zh-TW')}</Text>
            <Text style={s.cardText}>醫院：{x.hospitalName || '未填寫醫院'}</Text>
            {x.nextDueAt ? <Text style={s.cardMeta}>下次接種：{new Date(x.nextDueAt).toLocaleDateString('zh-TW')}</Text> : null}
        </TouchableOpacity>
      )}
    />
  );
}
type VaccinationDraft = {
  vaccineName: string;
  administeredAt: string;
  hospitalName: string;
  nextDueAt: string;
  notes: string;
  createReminder: boolean;
  [key: string]: string | boolean;
};

export function VaccinationFormScreen() {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const route = useRoute<RouteProp<HomeStackParamList, 'VaccinationForm'>>();
  const nav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const existing = route.params?.record as Vaccination | undefined;
  const duplicate = route.params?.duplicate === true;
  const [d, setD] = useState<VaccinationDraft>(
    (existing ? { ...empty(), ...existing } : empty()) as VaccinationDraft,
  );
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof VaccinationDraft>(key: K, value: VaccinationDraft[K]) =>
    setD((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (!session?.userId || !selectedPet || saving) return;
    if (!d.vaccineName.trim()) {
      Alert.alert('請填寫疫苗名稱');
      return;
    }
    const administered = validDate(d.administeredAt);
    const nextDue = d.nextDueAt ? validDate(d.nextDueAt) : undefined;
    if (!administered || (d.nextDueAt && !nextDue)) { Alert.alert('日期錯誤', '請選擇有效的接種日期。'); return; }
    if (nextDue && nextDue < administered) { Alert.alert('日期順序錯誤', '下次接種日期不能早於接種日期。'); return; }
    setSaving(true);
    try {
      const payload = {
        vaccineName: d.vaccineName.trim(), administeredAt: d.administeredAt,
        hospitalName: d.hospitalName.trim(), nextDueAt: d.nextDueAt || null, notes: d.notes.trim(),
        attachmentIds: Array.isArray(d.attachmentIds) ? d.attachmentIds : [], createReminder: d.createReminder,
      };
      const r = existing && !duplicate
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
        ['administeredAt', '接種日期（必填）'],
        ['hospitalName', '醫院'],
        ['nextDueAt', '下次接種日期（選填，需晚於接種日期）'],
        ['notes', '備註'],
      ].map(([k, l]) => {
        const isDate = k === 'administeredAt' || k === 'nextDueAt';
        if (isDate) return (
          <DatePickerField key={`${k}-${String(d[k])}`} label={l} value={validDate(d[k])}
            onChange={(date) => set(k, `${date.toISOString().slice(0, 10)}T12:00:00.000Z`)} minimumDate={k === 'nextDueAt' ? (validDate(d.administeredAt) || new Date()) : undefined} maximumDate={k === 'administeredAt' ? new Date() : undefined} />
        );
        return (<View key={k}><Text style={s.label}>{l}</Text><TextInput style={s.input} placeholder={`請輸入${l.replace('（必填）', '')}`} placeholderTextColor="#8A817B" value={typeof d[k] === 'string' ? d[k] : ''} onChangeText={(v) => set(k, v)} /></View>);
      })}
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
      <Text>備註：{record.notes || '未填寫'}</Text>
      {record.nextDueAt ? (
        <Text>下次接種：{new Date(record.nextDueAt).toLocaleDateString('zh-TW')}</Text>
      ) : null}
      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.primary, s.actionButton]}
          onPress={() => nav.navigate('VaccinationForm', { record })}
        >
          <Text style={s.primaryText}>編輯紀錄</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.secondary, s.actionButton]}
          onPress={() => nav.navigate('VaccinationForm', { record, duplicate: true })}
        >
          <Text style={s.secondaryText}>複製新增</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={s.deleteButton}
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
    marginTop: 12,
    gap: 5,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 }, cardIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  name: { flex: 1, color: Colors.text, fontSize: 18, fontWeight: '700' }, cardText: { color: Colors.text, lineHeight: 20 }, cardMeta: { color: Colors.primary, fontWeight: '700' },
  label: { color: '#3B4A43', fontSize: 14, fontWeight: '800', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#FFFFFF', color: '#2F3A34', borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    minHeight: 52,
    marginBottom: 10,
  },
  primary: {
    flexDirection: 'row', gap: 7, justifyContent: 'center', backgroundColor: Colors.primary,
    padding: 14,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    marginVertical: 10,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  actionButton: { flex: 1, marginVertical: 0 },
  secondary: { borderWidth: 1, borderColor: '#3f8064', borderRadius: 14, minHeight: 52, padding: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#3f8064', fontWeight: '700' },
  empty: { color: Colors.text, fontWeight: '700', textAlign: 'center' },
  error: { color: '#b42318' },
  check: { padding: 12, minHeight: 44, justifyContent: 'center' },
  deleteButton: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 24, marginTop: 8 },
  delete: { color: '#b42318', textAlign: 'center', fontWeight: '700' },
});
