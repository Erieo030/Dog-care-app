/** 用途：集中時間軸類型的繁中標籤、圖示與固定導航 mapping。 */
import { Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/types';
import { TimelineItem, TimelineType } from '../types';
export const TIMELINE_META: Record<TimelineType, { label: string; icon: string }> = {
  reminder_completed: { label: '提醒', icon: '✓' },
  health_event: { label: '健康異常', icon: '♡' },
  weight: { label: '體重', icon: '⚖' },
  medical_visit: { label: '就醫', icon: '＋' },
  daily_log: { label: '日常', icon: '📝' },
  vaccination: { label: '疫苗', icon: '💉' },
  deworming: { label: '驅蟲', icon: '🛡️' },
  medication: { label: '用藥', icon: '💊' },
  life_event: { label: '生活紀錄', icon: '•' },
};
export const openTimelineSource = (
  navigation: NativeStackNavigationProp<HomeStackParamList>,
  item: TimelineItem,
) => {
  if (!item.sourceId) {
    Alert.alert('無法開啟', '這筆時間軸缺少來源資料。');
    return;
  }
  switch (item.type) {
    case 'reminder_completed':
      navigation.navigate('ReminderList', { focusReminderId: item.sourceId });
      break;
    case 'health_event':
      navigation.navigate('HealthEventDetail', { eventId: item.sourceId });
      break;
    case 'weight':
      navigation.navigate('WeightList', { focusRecordId: item.sourceId });
      break;
    case 'medical_visit':
      navigation.navigate('MedicalVisitDetail', { visitId: item.sourceId });
      break;
    case 'daily_log':
      navigation.navigate('DailyLog', { recordId: item.sourceId, recordDate: item.occurredAt });
      break;
    case 'vaccination':
      navigation.navigate('VaccinationDetail', { recordId: item.sourceId });
      break;
    case 'deworming':
      navigation.navigate('DewormingDetail', { recordId: item.sourceId });
      break;
    case 'medication':
      navigation.navigate('MedicationDetail', { recordId: item.sourceId });
      break;
    default:
      Alert.alert('無法開啟', '這類紀錄目前沒有詳細頁。');
  }
};
