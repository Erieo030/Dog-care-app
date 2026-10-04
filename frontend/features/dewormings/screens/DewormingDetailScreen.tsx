/** 用途：查看驅蟲紀錄，提供編輯、複製新增與刪除。 */
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
import { deleteDeworming, getDeworming } from '../../../services/dewormingService';
import type { Deworming } from '../../../types';
import { dewormingStyles as styles } from '../dewormingStyles';
import { dewormingTypeLabels } from '../types';

function DetailRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <View style={[styles.detailRow, multiline && styles.detailRowMultiline]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, multiline && styles.detailValueMultiline]}>{value}</Text>
    </View>
  );
}

export function DewormingDetailScreen() {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const route = useRoute<RouteProp<HomeStackParamList, 'DewormingDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [record, setRecord] = useState<Deworming | null>(null);
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
        setError('找不到帳號或驅蟲紀錄');
        setLoading(false);
        return;
      }
      getDeworming(userId, recordId, controller.signal)
        .then((response) => {
          if (!cancelled) setRecord(response.record);
        })
        .catch((caught) => {
          if (!cancelled) setError((caught as Error).message || '無法載入驅蟲紀錄');
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
  if (loading) return <ScreenState loading text="正在載入驅蟲紀錄…" />;
  if (error || !record)
    return (
      <ScreenState
        error
        text={error || '找不到驅蟲紀錄'}
        action={() => setRetryKey((key) => key + 1)}
      />
    );
  const deleteRecord = () =>
    Alert.alert('刪除驅蟲紀錄', '確定要刪除嗎？', [
      { text: '取消' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          if (!userId || deleting) return;
          setDeleting(true);
          try {
            await deleteDeworming(userId, record.id);
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
          <Ionicons name="shield-checkmark-outline" size={24} color={Colors.success} />
        </View>
        <View style={styles.detailHeroCopy}>
          <Text style={styles.formEyebrow}>{dewormingTypeLabels[record.type]}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {record.productName}
          </Text>
          <Text style={styles.formHint}>
            使用於 {new Date(record.administeredAt).toLocaleDateString('zh-TW')}
          </Text>
        </View>
      </View>
      <View style={styles.detailGroup}>
        <DetailRow
          label="下次日期"
          value={
            record.nextDueAt ? new Date(record.nextDueAt).toLocaleDateString('zh-TW') : '尚未安排'
          }
        />
        {record.dosageText ? <DetailRow label="使用劑量" value={record.dosageText} /> : null}
        <DetailRow label="提醒" value={record.reminderId ? '已建立提醒' : '尚未建立提醒'} />
        {record.notes ? <DetailRow label="補充備註" value={record.notes} multiline /> : null}
      </View>
      <View style={styles.actionRow}>
        <RecordActionButton
          kind="edit"
          label="編輯紀錄"
          style={styles.actionButton}
          onPress={() => navigation.navigate('DewormingForm', { record })}
        />
        <AppButton
          title="複製新增"
          variant="secondary"
          fullWidth={false}
          style={[styles.secondary, styles.actionButton]}
          onPress={() => navigation.navigate('DewormingForm', { record, duplicate: true })}
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
