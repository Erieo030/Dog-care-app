/** 用途：顯示目前毛孩依日期排序的就醫紀錄列表與完整畫面狀態。 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../constants/Colors';
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
  if (loading) return <Center loading text="正在載入就醫紀錄…" />;
  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        <TouchableOpacity
          style={s.primary}
          onPress={() => navigation.navigate('MedicalVisitForm', {})}
        >
          <Text style={s.primaryText}>＋ 新增就醫紀錄</Text>
        </TouchableOpacity>
        {!!error && <Center text={error} action={load} />}
        {!error && !items.length && <Text style={s.empty}>目前沒有就醫紀錄</Text>}
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={s.card}
            onPress={() => navigation.navigate('MedicalVisitDetail', { visitId: item.id })}
          >
            <Text style={s.date}>{new Date(item.visitedAt).toLocaleDateString('zh-TW')}</Text>
            <Text style={s.clinic}>{item.clinicName || '未填寫醫院'}</Text>
            <Text style={s.reason}>看診原因：{item.reason}</Text>
            <Text style={s.meta}>
              附件 {item.attachments?.length || 0} 份 藥物 {item.medications?.length || 0} 筆
            </Text>
            <Text style={s.meta}>
              下次回診：
              {item.followUpAt ? new Date(item.followUpAt).toLocaleDateString('zh-TW') : '未安排'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  content: { padding: 20, paddingBottom: 50 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  primary: {
    backgroundColor: Colors.primary,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryText: { color: '#FFF', fontWeight: '800' },
  empty: { color: Colors.subtext, textAlign: 'center', padding: 18 },
  retry: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 10,
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
  date: { color: Colors.subtext, fontSize: 12 },
  clinic: { color: Colors.text, fontSize: 19, fontWeight: '800', marginTop: 4 },
  reason: { color: Colors.text, marginTop: 8, lineHeight: 21 },
  meta: { color: Colors.subtext, fontSize: 12, marginTop: 8 },
});
