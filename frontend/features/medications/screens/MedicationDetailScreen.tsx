/**
 * 用途：查看用藥療程、執行編輯、複製、完成、停止、刪除。
 * API：../../../services/medicationService.ts
 */
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
import {
  completeMedication,
  deleteMedication,
  getMedication,
  stopMedication,
} from '../../../services/medicationService';
import type { MedicationCourse } from '../../../types';
import { MedicationDetailRow } from '../components/MedicationDetailRow';
import { medicationStyles as styles } from '../medicationStyles';
import { mealTimingLabels } from '../types';

export function MedicationDetailScreen() {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const route = useRoute<RouteProp<HomeStackParamList, 'MedicationDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [record, setRecord] = useState<MedicationCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
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
        setError('找不到帳號或用藥紀錄');
        setLoading(false);
        return;
      }
      getMedication(userId, recordId, controller.signal)
        .then((response) => {
          if (!cancelled) setRecord(response.record);
        })
        .catch((caught) => {
          if (!cancelled) setError((caught as Error).message || '無法載入用藥紀錄');
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

  if (loading) return <ScreenState loading text="正在載入用藥紀錄…" />;
  if (error || !record) {
    return (
      <ScreenState
        error
        text={error || '找不到用藥紀錄'}
        action={() => setRetryKey((key) => key + 1)}
      />
    );
  }

  const confirmAction = (
    action: (userId: string, recordId: string) => Promise<unknown>,
    label: string,
  ) =>
    Alert.alert(label, `確定要${label}嗎？`, [
      { text: '取消' },
      {
        text: '確定',
        onPress: async () => {
          if (!userId || submitting) return;
          setSubmitting(true);
          try {
            await action(userId, record.id);
            navigation.goBack();
          } catch (caught) {
            Alert.alert(`${label}失敗`, (caught as Error).message || '請稍後再試');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: bottomContentPadding }]}>
      <View style={styles.detailHero}>
        <View style={styles.detailHeroIcon}>
          <Ionicons name="medical-outline" size={24} color={Colors.success} />
        </View>
        <View style={styles.detailHeroCopy}>
          <Text style={styles.formEyebrow}>用藥療程</Text>
          <Text style={styles.title} numberOfLines={2}>
            {record.name}
          </Text>
          <Text style={styles.formHint}>
            {record.status === 'active'
              ? '目前服用中'
              : record.status === 'completed'
                ? '療程已完成'
                : '療程已停止'}
          </Text>
        </View>
      </View>

      <View style={styles.detailGroup}>
        <MedicationDetailRow label="使用說明" value={record.instructions || '未填寫'} multiline />
        <MedicationDetailRow label="每日次數" value={`每天 ${record.timesPerDay} 次`} />
        <MedicationDetailRow
          label="療程期間"
          value={`${record.startDate}${record.endDate ? ` ～ ${record.endDate}` : ' 起'}`}
        />
        <MedicationDetailRow label="用餐時間" value={mealTimingLabels[record.mealTiming]} />
        <MedicationDetailRow label="提醒時間" value={record.reminderTimes.join('、') || '未設定'} />
        {record.notes ? (
          <MedicationDetailRow label="補充備註" value={record.notes} multiline />
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <RecordActionButton
          kind="edit"
          label="編輯紀錄"
          style={styles.actionButton}
          onPress={() => navigation.navigate('MedicationForm', { record })}
        />
        <AppButton
          title="複製新增"
          variant="secondary"
          fullWidth={false}
          style={[styles.secondary, styles.actionButton]}
          onPress={() => navigation.navigate('MedicationForm', { record, duplicate: true })}
        />
      </View>
      {record.status === 'active' ? (
        <>
          <AppButton
            title="完成療程"
            variant="secondary"
            fullWidth={false}
            disabled={submitting}
            busy={submitting}
            style={styles.secondaryAction}
            onPress={() => confirmAction(completeMedication, '完成療程')}
          />
          <AppButton
            title="停止療程"
            variant="secondary"
            fullWidth={false}
            disabled={submitting}
            busy={submitting}
            style={styles.secondaryAction}
            onPress={() => confirmAction(stopMedication, '停止療程')}
          />
        </>
      ) : null}
      <RecordActionButton
        kind="delete"
        label={submitting ? '刪除中…' : '刪除'}
        disabled={submitting}
        busy={submitting}
        style={styles.deleteButton}
        onPress={() => confirmAction(deleteMedication, '刪除用藥紀錄')}
      />
    </ScrollView>
  );
}
