/** 用途：集中時間軸類型的繁中標籤、圖示與固定導航 mapping。 */
import { Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/types';
import { TimelineItem, TimelineType } from '../types';
export const TIMELINE_META: Record<TimelineType, { label: string; icon: string }> = {
  reminder_completed: { label: '提醒', icon: 'checkmark-circle-outline' },
  health_event: { label: '健康異常', icon: 'alert-circle-outline' },
  weight: { label: '體重', icon: 'scale-outline' },
  medical_visit: { label: '就醫', icon: 'business-outline' },
  daily_log: { label: '日常', icon: 'journal-outline' },
  vaccination: { label: '疫苗', icon: 'medkit-outline' },
  deworming: { label: '驅蟲', icon: 'shield-checkmark-outline' },
  medication: { label: '用藥', icon: 'medical-outline' },
  life_event: { label: '生活紀錄', icon: 'paw-outline' },
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
      if (item.linkedSourceType && item.linkedSourceId) {
        if (item.linkedSourceType === 'vaccination') navigation.navigate('VaccinationDetail', { recordId: item.linkedSourceId });
        else if (item.linkedSourceType === 'deworming') navigation.navigate('DewormingDetail', { recordId: item.linkedSourceId });
        else if (item.linkedSourceType === 'medication') navigation.navigate('MedicationDetail', { recordId: item.linkedSourceId });
        else if (item.linkedSourceType === 'medical_visit') navigation.navigate('MedicalVisitDetail', { visitId: item.linkedSourceId });
        else navigation.navigate('ReminderList', { focusReminderId: item.sourceId });
      } else navigation.navigate('ReminderList', { focusReminderId: item.sourceId });
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
