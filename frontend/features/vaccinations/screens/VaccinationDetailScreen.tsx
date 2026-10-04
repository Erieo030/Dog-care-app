/** 用途：查看疫苗資料，提供編輯、複製新增與刪除。 */
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../../../components/AppButton';
import { RecordActionButton } from '../../../components/RecordActionButton';
import { Colors } from '../../../constants/Colors';
import { useTabContentBottomPadding } from '../../../components/navigation/useTabContentBottomPadding';
import ScreenState from '../../../components/ScreenState';
import { useAuth } from '../../../contexts/AuthContext';
import type { HomeStackParamList } from '../../../navigation/types';
import { deleteVaccination, getVaccination } from '../../../services/vaccinationService';
import type { Vaccination } from '../../../types';
import { vaccinationStyles as styles } from '../vaccinationStyles';
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}
export function VaccinationDetailScreen() {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const route = useRoute<RouteProp<HomeStackParamList, 'VaccinationDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [record, setRecord] = useState<Vaccination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const userId = session?.userId;
  const recordId = route.params?.recordId;
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      let cancelled = false;
      setRecord(null);
      setError('');
      setLoading(true);
      if (!userId || !recordId) {
        setError('找不到帳號或疫苗紀錄');
        setLoading(false);
        return;
      }
      getVaccination(userId, recordId, controller.signal)
        .then((response) => {
          if (!cancelled) setRecord(response.record);
        })
        .catch((caught) => {
          if (!cancelled) setError((caught as Error).message || '無法載入疫苗紀錄');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        controller.abort();
        cancelled = true;
      };
      // retryKey intentionally re-runs this focused request after the retry action.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recordId, retryKey, userId]),
  );
  if (loading) return <ScreenState loading text="正在載入疫苗紀錄…" />;
  if (error || !record)
    return (
      <ScreenState
        error
        text={error || '找不到疫苗紀錄'}
        action={() => setRetryKey((key) => key + 1)}
      />
    );
  const deleteRecord = () =>
    Alert.alert('刪除疫苗', '確定刪除？', [
      { text: '取消' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          if (!userId || deleting) return;
          setDeleting(true);
          try {
            await deleteVaccination(userId, record.id);
            navigation.goBack();
          } catch (caught) {
            Alert.alert('刪除失敗', (caught as Error).message || '請稍後再試');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: bottomContentPadding }]}>
      <View style={styles.detailHero}>
        <View style={styles.detailHeroIcon}>
          <Ionicons name="medkit-outline" size={23} color={Colors.success} />
        </View>
        <View style={styles.detailHeroCopy}>
          <Text numberOfLines={2} style={styles.detailTitle}>
            {record.vaccineName}
          </Text>
          <Text style={styles.detailDate}>
            接種於 {new Date(record.administeredAt).toLocaleDateString('zh-TW')}
          </Text>
        </View>
      </View>
      <View style={styles.detailGroup}>
        {record.hospitalName ? <DetailRow label="動物醫院" value={record.hospitalName} /> : null}
        <DetailRow
          label="下次接種"
          value={
            record.nextDueAt ? new Date(record.nextDueAt).toLocaleDateString('zh-TW') : '尚未安排'
          }
        />
        {record.notes ? <DetailRow label="補充備註" value={record.notes} /> : null}
      </View>
      <View style={styles.actionRow}>
        <RecordActionButton
          kind="edit"
          label="編輯紀錄"
          style={styles.actionButton}
          onPress={() => navigation.navigate('VaccinationForm', { record })}
        />
        <AppButton
          title="複製新增"
          variant="secondary"
          fullWidth={false}
          style={[styles.secondary, styles.actionButton]}
          onPress={() => navigation.navigate('VaccinationForm', { record, duplicate: true })}
        />
      </View>
      <RecordActionButton
        kind="delete"
        label={deleting ? '刪除中…' : '刪除'}
        style={styles.deleteButton}
        onPress={deleteRecord}
        disabled={deleting}
        busy={deleting}
      />
    </ScrollView>
  );
}
