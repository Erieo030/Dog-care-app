/**
 * 用途：新增、編輯與複製用藥療程。
 * 表單型別：../types.ts
 * API：../../../services/medicationService.ts
 */
import React, { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../../../components/AppButton';
import { RecordActionButton } from '../../../components/RecordActionButton';
import SupplementalNotesField from '../../../components/SupplementalNotesField';
import { Colors } from '../../../constants/Colors';
import DatePickerField from '../../../components/DatePickerField';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';
import { showQuickRecordFeedback } from '../../../utils/quickRecordFeedback';
import { useTabContentBottomPadding } from '../../../components/navigation/useTabContentBottomPadding';
import { useAuth } from '../../../contexts/AuthContext';
import { usePet } from '../../../contexts/PetContext';
import type { HomeStackParamList } from '../../../navigation/types';
import { createMedication, updateMedication } from '../../../services/medicationService';
import type { MedicationCourse, MedicationMealTiming } from '../../../types';
import { medicationStyles as styles } from '../medicationStyles';
import {
  createBlankMedicationDraft,
  mealTimingLabels,
  timeValue,
  type MedicationDraft,
} from '../types';
import { localDateKey } from '../../../utils/taipeiDate';

const fields = [
  ['name', '藥品名稱（必填）'],
  ['startDate', '開始日期（必填）'],
  ['endDate', '結束日期（選填）'],
  ['instructions', '使用說明／每次用量（選填）'],
  ['timesPerDay', '每日次數（必填）'],
  ['notes', '補充備註'],
] as const;

export function MedicationFormScreen() {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const route = useRoute<RouteProp<HomeStackParamList, 'MedicationForm'>>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const existing = route.params?.record as MedicationCourse | undefined;
  const duplicate = route.params?.duplicate === true;
  const quickEntry = route.params?.quickEntry === true;
  const [draft, setDraft] = useState<MedicationDraft>({
    ...createBlankMedicationDraft(),
    ...(existing || {}),
  });
  const [saving, setSaving] = useState(false);
  const [editingReminderTime, setEditingReminderTime] = useState<string | null>(null);
  const setField = <Key extends keyof MedicationDraft>(key: Key, value: MedicationDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!session?.userId || !selectedPet || saving) return;
    if (!draft.name.trim()) {
      Alert.alert('請填寫藥名');
      return;
    }
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
      Alert.alert('日期順序錯誤', '結束日期不能早於開始日期。');
      return;
    }

    const reminderTime = draft.reminderTimeDraft.trim();
    if (reminderTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) {
      Alert.alert('提醒時間格式錯誤', '請使用 HH:MM，例如 08:00');
      return;
    }

    let reminderTimes = draft.reminderTimes;
    if (reminderTime) {
      reminderTimes = editingReminderTime
        ? reminderTimes.map((item) => (item === editingReminderTime ? reminderTime : item))
        : reminderTimes.includes(reminderTime)
          ? reminderTimes
          : [...reminderTimes, reminderTime];
    }
    reminderTimes = [...new Set(reminderTimes)];

    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        instructions: draft.instructions.trim(),
        timesPerDay: draft.timesPerDay,
        startDate: draft.startDate,
        endDate: draft.endDate || '',
        mealTiming: draft.mealTiming,
        notes: draft.notes.trim(),
        status: draft.status,
        reminderTimes,
        reminderEnabled: reminderTimes.length > 0,
        medicalVisitId: draft.medicalVisitId,
      };
      const response =
        existing && !duplicate
          ? await updateMedication(session.userId, existing.id, payload)
          : await createMedication(session.userId, selectedPet.id, payload);
      if (quickEntry) {
        showQuickRecordFeedback({
          message: '用藥紀錄已儲存，完整內容可到「紀錄」查看。',
          onDone: () => navigation.popToTop(),
          onAddAnother: () => navigation.replace('MedicationForm', { quickEntry: true }),
        });
      } else {
        Alert.alert('已儲存', '用藥紀錄已更新');
        navigation.replace('MedicationDetail', { recordId: response.record.id });
      }
    } catch (caught) {
      Alert.alert('儲存失敗', (caught as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={[styles.page, { paddingBottom: bottomContentPadding }]}
    >
      <View style={styles.formIntro}>
        <View style={styles.formIntroIcon}>
          <Ionicons name="medical-outline" size={22} color={Colors.success} />
        </View>
        <View style={styles.formIntroCopy}>
          <Text style={styles.formEyebrow}>用藥照護</Text>
          <Text style={styles.title}>{existing ? '編輯用藥' : '新增用藥療程'}</Text>
          <Text style={styles.formHint}>依獸醫指示記下療程與提醒，避免漏服或重複記錄。</Text>
        </View>
      </View>

      {fields
        .filter(([key]) => key !== 'notes')
        .map(([key, label]) => {
          const isDate = key === 'startDate' || key === 'endDate';
          if (isDate) {
            const value = draft[key];
            return (
              <DatePickerField
                key={key}
                label={label}
                value={value ? new Date(`${value}T12:00:00`) : undefined}
                onChange={(date) => setField(key, localDateKey(date))}
                minimumDate={
                  key === 'endDate' && draft.startDate
                    ? new Date(`${draft.startDate}T12:00:00`)
                    : undefined
                }
                maximumDate={key === 'startDate' ? new Date() : undefined}
              />
            );
          }
          return (
            <View key={key}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                placeholder={`請輸入${label.replace('（必填）', '')}`}
                placeholderTextColor={Colors.subtext}
                value={String(draft[key] ?? '')}
                keyboardType={key === 'timesPerDay' ? 'numeric' : 'default'}
                onChangeText={(value) =>
                  setField(key, key === 'timesPerDay' ? Number(value) : value)
                }
              />
            </View>
          );
        })}
      <SupplementalNotesField
        value={String(draft.notes ?? '')}
        onChange={(value) => setField('notes', value)}
      />

      <Text style={styles.section}>服用方式</Text>
      <View style={styles.options}>
        {(Object.keys(mealTimingLabels) as MedicationMealTiming[]).map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, draft.mealTiming === key && styles.selected]}
            onPress={() => setField('mealTiming', key)}
          >
            <Text>{mealTimingLabels[key]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <DatePickerField
        label="每天提醒時間（選填）"
        mode="time"
        value={timeValue(draft.reminderTimeDraft || draft.reminderTimes[0])}
        onChange={(date) => {
          const next = date.toTimeString().slice(0, 5);
          setField('reminderTimeDraft', next);
          if (editingReminderTime) {
            setField(
              'reminderTimes',
              draft.reminderTimes.map((item) => (item === editingReminderTime ? next : item)),
            );
            setEditingReminderTime(null);
          }
        }}
      />
      {draft.reminderTimes.map((time) => (
        <View key={time} style={styles.reminderRow}>
          <Text style={styles.reminderHint}>每天 {time}</Text>
          <RecordActionButton
            kind="edit"
            label="編輯"
            style={styles.reminderAction}
            onPress={() => {
              setEditingReminderTime(time);
              setField('reminderTimeDraft', time);
            }}
          />
          <RecordActionButton
            kind="delete"
            label="刪除"
            style={styles.reminderAction}
            onPress={() =>
              setField(
                'reminderTimes',
                draft.reminderTimes.filter((item) => item !== time),
              )
            }
          />
        </View>
      ))}

      <AppButton
        title={saving ? '儲存中…' : '儲存'}
        variant="primary"
        disabled={saving}
        busy={saving}
        style={styles.primary}
        textStyle={styles.primaryText}
        onPress={save}
      />
      <Text style={styles.notice}>MEGO 僅協助記錄用藥資訊與提醒，請依獸醫指示使用。</Text>
    </KeyboardAwareScrollView>
  );
}
