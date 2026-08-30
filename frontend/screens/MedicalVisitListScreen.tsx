/** 用途：顯示目前毛孩依日期排序的就醫紀錄列表與完整畫面狀態。 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import ScreenState from '../components/ScreenState';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import * as service from '../services/medicalVisitService';
import { MedicalVisit } from '../types';
type Props = NativeStackScreenProps<HomeStackParamList, 'MedicalVisitList'>;
export default function MedicalVisitListScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [items, setItems] = useState<MedicalVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const current = ++requestId.current;
    setItems([]);
    if (!selectedPet || !session?.userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError('');
      const result = await service.getMedicalVisits(session.userId, selectedPet.id);
      if (current === requestId.current) setItems(result);
    } catch (e) {
      if (current === requestId.current) setError((e as Error).message || '無法載入就醫紀錄');
    } finally {
      if (current === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedPet, session?.userId]);
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );
  if (loading) return <ScreenState loading text="正在載入就醫紀錄…" />;
  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={error ? [] : items}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListHeaderComponent={<>
          <View style={s.listHeader}><View style={s.listHeaderIcon}><Ionicons name="business-outline" size={23} color={Colors.success} /></View><View style={s.listHeaderBody}><Text style={s.title}>就醫紀錄</Text><Text style={s.listSubtitle}>保存 {selectedPet?.name || '毛孩'} 每次看診的重要內容</Text></View></View>
          <TouchableOpacity style={s.primary} onPress={() => navigation.navigate('MedicalVisitForm', {})}><Ionicons name="add" size={20} color="#FFF" /><Text style={s.primaryText}>新增就醫紀錄</Text></TouchableOpacity>
          {!!error && <Center text={error} action={load} />}
        </>}
        ListEmptyComponent={!error ? <View style={s.emptyBox}><View style={s.emptyIcon}><Ionicons name="business-outline" size={27} color={Colors.success} /></View><Text style={s.emptyTitle}>目前沒有就醫紀錄</Text><Text style={s.emptyHint}>下次看診後，再把重要內容留在這裡。</Text></View> : null}
        renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`查看就醫紀錄：${item.clinicName || '未填寫醫院'}`} style={s.card} onPress={() => navigation.navigate('MedicalVisitDetail', { visitId: item.id })}>
          <View style={s.cardTitleRow}><View style={s.cardIcon}><Ionicons name="business-outline" size={18} color={Colors.success} /></View><View style={s.cardTitleBody}><Text style={s.clinic}>{item.clinicName || '未填寫醫院'}</Text><Text style={s.date}>{new Date(item.visitedAt).toLocaleDateString('zh-TW')}</Text></View><Ionicons name="chevron-forward" size={17} color={Colors.subtext} /></View>
          <Text style={s.reason}>看診原因：{item.reason}</Text>
          <Text style={s.meta}>附件 {item.attachments?.length || 0} 份 藥物 {item.medications?.length || 0} 筆</Text>
          <Text style={s.meta}>下次回診：{item.followUpAt ? new Date(item.followUpAt).toLocaleDateString('zh-TW') : '未安排'}</Text>
        </TouchableOpacity>}
      />
    </SafeAreaView>
  );
}
function Center({
  text,
  loading,
  action,
}: {
  text: string;
  loading?: boolean;
  action?: () => void;
}) {
  return (
    <View style={s.center}>
      {loading && <ActivityIndicator color={Colors.primary} />}
      <Text style={s.empty}>{text}</Text>
      {action && (
        <TouchableOpacity style={s.retry} onPress={action}>
          <Text style={s.retryText}>重新載入</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 50 },
  listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  listHeaderIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  listHeaderBody: { flex: 1 },
  title: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  listSubtitle: { color: Colors.subtext, fontSize: 13, marginTop: 3 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  primary: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 14,
    minHeight: 52,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryText: { color: '#FFF', fontWeight: '800' },
  emptyBox: { alignItems: 'center', paddingVertical: 28 },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { color: Colors.text, fontWeight: '700', textAlign: 'center' },
  emptyHint: { color: '#887A6D', fontSize: 13, marginTop: 6, textAlign: 'center' },
  empty: { color: Colors.subtext, textAlign: 'center', padding: 18 },
  retry: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryText: { color: Colors.text, fontWeight: '700' },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 17,
    marginBottom: 11,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  cardTitleBody: { flex: 1 },
  date: { color: Colors.subtext, fontSize: 12 },
  clinic: { color: Colors.text, fontSize: 19, fontWeight: '800', marginTop: 4 },
  reason: { color: Colors.text, marginTop: 8, lineHeight: 21 },
  copy: { color: Colors.primary, fontWeight: '800', marginTop: 8 },
  meta: { color: Colors.subtext, fontSize: 12, marginTop: 8 },
});
