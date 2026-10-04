import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：顯示就醫完整內容，提供編輯、連動刪除與規則式文字分享。 */
import React, { useCallback, useRef, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import { RecordActionButton } from '../components/RecordActionButton';
import { Colors } from '../constants/Colors';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import AttachmentGallery from '../components/AttachmentGallery';
import { buildMedicalVisitShareText } from '../constants/MedicalVisits';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import * as service from '../services/medicalVisitService';
import { MedicalVisit } from '../types';
import {
  MedicalVisitDetailRows,
  MedicalVisitDetailState,
  MedicalVisitMedicationCards,
} from '../features/medical-visits/components/MedicalVisitDetailSections';
import {
  buildMedicalVisitDetailRows,
  formatMedicalVisitDate,
} from '../features/medical-visits/medicalVisitDetailContent';
type Props = NativeStackScreenProps<HomeStackParamList, 'MedicalVisitDetail'>;
export default function MedicalVisitDetailScreen({ route, navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [item, setItem] = useState<MedicalVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [sharePreparing, setSharePreparing] = useState(false);
  const requestId = useRef(0);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const current = ++requestId.current;
      setItem(null);
      if (!session?.userId || !selectedPet) {
        setError('找不到目前選取的毛孩');
        setLoading(false);
        return;
      }
      try {
        setError('');
        const result = await service.getMedicalVisit(session.userId, route.params.visitId, signal);
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
    },
    [route.params.visitId, selectedPet, session?.userId],
  );
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      setLoading(true);
      void load(controller.signal);
      return () => {
        controller.abort();
        requestId.current += 1;
      };
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
  if (loading) return <MedicalVisitDetailState loading text="正在載入就醫紀錄…" />;
  if (error || !item)
    return (
      <MedicalVisitDetailState
        text={error || '找不到就醫紀錄'}
        onRetry={() => {
          setLoading(true);
          load();
        }}
      />
    );
  const rows = buildMedicalVisitDetailRows(item);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.container}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomContentPadding }]}>
        <View style={s.detailHero}>
          <View style={s.detailHeroIcon}>
            <Ionicons name="medical-outline" size={25} color={Colors.primary} />
          </View>
          <View style={s.detailHeroCopy}>
            <Text style={s.detailEyebrow}>就醫紀錄</Text>
            <Text style={s.detailTitle} numberOfLines={2}>
              {item.reason}
            </Text>
            <Text style={s.detailHint}>
              {formatMedicalVisitDate(item.visitedAt)}
              {item.clinicName ? `・${item.clinicName}` : ''}
            </Text>
          </View>
        </View>
        <View style={s.actions}>
          <RecordActionButton
            kind="edit"
            label="編輯"
            disabled={deleting || sharePreparing}
            busy={deleting || sharePreparing}
            style={s.actionButton}
            onPress={() => navigation.navigate('MedicalVisitForm', { visit: item })}
          />
          <AppButton
            title={sharePreparing ? '準備中…' : '分享摘要'}
            variant="secondary"
            fullWidth={false}
            disabled={deleting || sharePreparing}
            busy={sharePreparing}
            style={s.share}
            onPress={share}
          />
        </View>
        <RecordActionButton
          kind="delete"
          label={deleting ? '刪除中…' : '刪除就醫紀錄'}
          disabled={deleting || sharePreparing}
          busy={deleting}
          style={s.deleteAction}
          onPress={remove}
        />
        <MedicalVisitDetailRows rows={rows} />
        <Text style={s.heading}>藥物</Text>
        <MedicalVisitMedicationCards medications={item.medications ?? []} />
        <Text style={s.heading}>健康文件／附件</Text>
        <AttachmentGallery items={item.attachments ?? []} userId={session!.userId} />
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 42 },
  detailHero: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  detailHeroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  detailHeroCopy: { flex: 1 },
  detailEyebrow: { color: Colors.primary, fontSize: 13, fontWeight: '800', marginBottom: 2 },
  detailTitle: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  detailHint: { color: Colors.subtext, fontSize: 13, lineHeight: 19, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  actionButton: {
    flex: 1,
    minWidth: 0,
  },
  share: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareText: { color: Colors.primary, fontWeight: '800' },
  deleteAction: { alignSelf: 'flex-start', marginBottom: 12 },
  heading: { color: Colors.text, fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 10 },
});
