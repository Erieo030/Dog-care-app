/** 用途：顯示就醫完整內容，提供編輯、連動刪除與規則式文字分享。 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../constants/Colors';
import AttachmentGallery from '../components/AttachmentGallery';
import {
  buildMedicalVisitShareText,
  FOLLOW_UP_STATUS_LABELS,
  MEAL_TIMING_LABELS,
} from '../constants/MedicalVisits';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import * as service from '../services/medicalVisitService';
import { MedicalVisit } from '../types';
type Props = NativeStackScreenProps<HomeStackParamList, 'MedicalVisitDetail'>;
export default function MedicalVisitDetailScreen({ route, navigation }: Props) {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [item, setItem] = useState<MedicalVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [sharePreparing, setSharePreparing] = useState(false);
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const current = ++requestId.current;
    setItem(null);
    if (!session?.userId || !selectedPet) {
      setError('找不到目前選取的毛孩');
      setLoading(false);
      return;
    }
    try {
      setError('');
      const result = await service.getMedicalVisit(session.userId, route.params.visitId);
      if (current !== requestId.current) return;
      if (result.petId !== selectedPet.id) {
        setError('此紀錄不屬於目前選取的毛孩');
        return;
      }
      setItem(result);
    } catch (e) {
      if (current === requestId.current) setError((e as Error).message || '無法載入就醫紀錄');
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [route.params.visitId, selectedPet, session?.userId]);
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );
  const remove = () => {
    if (!item || !session?.userId || deleting) return;
    const reminderText = item.followUpReminderId ? '，並一併刪除對應的回診提醒' : '';
    Alert.alert(
      '刪除就醫紀錄',
      `確定刪除「${item.reason}」${reminderText}？此操作也會移除對應時間軸事件。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除紀錄',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await service.deleteMedicalVisit(session.userId, item.id);
              navigation.goBack();
            } catch (e) {
              Alert.alert('刪除失敗', (e as Error).message || '請稍後再試');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };
  const share = async () => {
    if (!item || !selectedPet || sharePreparing) return;
    setSharePreparing(true);
    try {
      await Share.share({
        title: `${selectedPet.name}的飼主就醫摘要`,
        message: buildMedicalVisitShareText(selectedPet, item),
      });
    } catch (e) {
      Alert.alert('無法分享', (e as Error).message);
    } finally {
      setSharePreparing(false);
    }
  };
  if (loading) return <Center loading text="正在載入就醫紀錄…" />;
  if (error || !item)
    return (
      <Center
        text={error || '找不到就醫紀錄'}
        action={() => {
          setLoading(true);
          load();
        }}
      />
    );
  const rows: [string, string][] = [
    ['就醫日期', new Date(item.visitedAt).toLocaleString('zh-TW')],
    ['動物醫院', item.clinicName || '未填寫'],
    ['獸醫姓名', item.veterinarianName || '未填寫'],
    ['看診原因', item.reason],
    ['獸醫說明', item.veterinarianNotes || '未填寫'],
    ['治療內容', item.treatmentNotes || '未填寫'],
    ['一般用藥說明', item.medicationNotes || '未填寫'],
    ['下次回診', item.followUpAt ? new Date(item.followUpAt).toLocaleString('zh-TW') : '未安排'],
    [
      '回診提醒',
      item.followUpReminderStatus
        ? FOLLOW_UP_STATUS_LABELS[item.followUpReminderStatus] || item.followUpReminderStatus
        : '未建立',
    ],
    ['費用', item.cost != null ? `NT$ ${item.cost}` : '未填寫'],
    ['備註', item.notes || '未填寫'],
    ['建立時間', item.createdAt ? new Date(item.createdAt).toLocaleString('zh-TW') : '未提供'],
    ['更新時間', item.updatedAt ? new Date(item.updatedAt).toLocaleString('zh-TW') : '未提供'],
  ];
  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.actions}>
          <TouchableOpacity
            disabled={deleting || sharePreparing}
            style={s.edit}
            onPress={() => navigation.navigate('MedicalVisitForm', { visit: item })}
          >
            <Text style={s.editText}>編輯</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={deleting || sharePreparing} style={s.share} onPress={share}>
            <Text style={s.shareText}>{sharePreparing ? '準備中…' : '分享摘要'}</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={deleting || sharePreparing} style={s.delete} onPress={remove}>
            <Text style={s.deleteText}>{deleting ? '刪除中…' : '刪除'}</Text>
          </TouchableOpacity>
        </View>
        {rows.map(([label, value]) => (
          <Row key={label} label={label} value={value} />
        ))}
        <Text style={s.heading}>藥物</Text>
        {!item.medications?.length ? (
          <Text style={s.empty}>目前沒有藥物</Text>
        ) : (
          item.medications.map((m, i) => (
            <View key={`${m.name}-${i}`} style={s.card}>
              <Text style={s.med}>{m.name}</Text>
              {!!m.instructions && <Text style={s.value}>服用方式：{m.instructions}</Text>}
              <Text style={s.value}>
                每日 {m.timesPerDay} 次｜{MEAL_TIMING_LABELS[m.mealTiming]}
              </Text>
              {(m.startDate || m.endDate) && (
                <Text style={s.value}>
                  期間：{m.startDate || '未填'} ～ {m.endDate || '未填'}
                </Text>
              )}
              {!!m.notes && <Text style={s.value}>備註：{m.notes}</Text>}
            </View>
          ))
        )}
        <Text style={s.heading}>健康文件／附件</Text>
        <AttachmentGallery items={item.attachments ?? []} userId={session!.userId} />
      </ScrollView>
    </SafeAreaView>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  edit: {
    flex: 1,
    minWidth: 80,
    backgroundColor: Colors.primary,
    padding: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  editText: { color: '#FFF', fontWeight: '800' },
  share: {
    flex: 1,
    minWidth: 100,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  shareText: { color: Colors.text, fontWeight: '800' },
  delete: {
    borderWidth: 1,
    borderColor: '#D96C6C',
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 14,
  },
  deleteText: { color: '#C34D4D', fontWeight: '800' },
  row: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    padding: 15,
  },
  label: { color: Colors.subtext, fontSize: 12 },
  value: { color: Colors.text, marginTop: 5, lineHeight: 21 },
  heading: { color: Colors.text, fontSize: 20, fontWeight: '800', marginTop: 22, marginBottom: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8 },
  med: { color: Colors.text, fontWeight: '800' },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  image: { width: 100, height: 100, borderRadius: 12 },
  fileName: { color: Colors.subtext, fontSize: 11, width: 100, marginTop: 3 },
  localNotice: { color: Colors.subtext, fontSize: 12, marginBottom: 10 },
  empty: { color: Colors.subtext, textAlign: 'center', padding: 14 },
  retry: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: Colors.text, fontWeight: '700' },
});
