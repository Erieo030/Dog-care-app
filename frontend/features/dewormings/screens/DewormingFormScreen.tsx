/** 用途：新增、編輯與複製驅蟲紀錄。 */
import React, { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../../../components/AppButton';
import SupplementalNotesField from '../../../components/SupplementalNotesField';
import { Colors } from '../../../constants/Colors';
import DatePickerField from '../../../components/DatePickerField';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';
import { showQuickRecordFeedback } from '../../../utils/quickRecordFeedback';
import { useTabContentBottomPadding } from '../../../components/navigation/useTabContentBottomPadding';
import { useAuth } from '../../../contexts/AuthContext';
import { usePet } from '../../../contexts/PetContext';
import type { HomeStackParamList } from '../../../navigation/types';
import { createDeworming, updateDeworming } from '../../../services/dewormingService';
import type { Deworming, DewormingType } from '../../../types';
import { dewormingStyles as styles } from '../dewormingStyles';
import {
  createBlankDewormingDraft,
  dewormingTypeLabels,
  validDewormingDate,
  type DewormingDraft,
} from '../types';
import { toTaipeiDateValue } from '../../../utils/taipeiDate';

const fields = [
  ['productName', '產品／藥品名稱（必填）'],
  ['administeredAt', '使用日期（必填）'],
  ['nextDueAt', '下次日期（選填，需晚於使用日期）'],
  ['dosageText', '使用劑量（選填）'],
  ['notes', '補充備註'],
] as const;

export function DewormingFormScreen() {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const route = useRoute<RouteProp<HomeStackParamList, 'DewormingForm'>>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const existing = route.params?.record as Deworming | undefined;
  const duplicate = route.params?.duplicate === true;
  const quickEntry = route.params?.quickEntry === true;
  const [draft, setDraft] = useState<DewormingDraft>({
    ...createBlankDewormingDraft(),
    ...(existing || {}),
  });
  const [saving, setSaving] = useState(false);
  const setField = <Key extends keyof DewormingDraft>(key: Key, value: DewormingDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!session?.userId || !selectedPet || saving) return;
    if (!draft.productName.trim()) return Alert.alert('請填寫產品名稱');
    const administered = validDewormingDate(draft.administeredAt);
    const nextDue = draft.nextDueAt ? validDewormingDate(draft.nextDueAt) : undefined;
    if (!administered || (draft.nextDueAt && !nextDue))
      return Alert.alert('日期錯誤', '請選擇有效的使用日期。');
    if (nextDue && nextDue < administered)
      return Alert.alert('日期順序錯誤', '下次日期不能早於使用日期。');
    setSaving(true);
    try {
      const payload = {
        type: draft.type,
        productName: draft.productName.trim(),
        administeredAt: draft.administeredAt,
        nextDueAt: draft.nextDueAt || null,
        notes: draft.notes.trim(),
        dosageText: draft.dosageText.trim(),
        attachmentIds: draft.attachmentIds || [],
        createReminder: draft.createReminder,
      };
      const response =
        existing && !duplicate
          ? await updateDeworming(session.userId, existing.id, payload)
          : await createDeworming(session.userId, selectedPet.id, payload);
      if (quickEntry) {
        showQuickRecordFeedback({
          message: '驅蟲紀錄已儲存，完整內容可到「紀錄」查看。',
          onDone: () => navigation.popToTop(),
          onAddAnother: () => navigation.replace('DewormingForm', { quickEntry: true }),
        });
      } else {
        Alert.alert('已儲存', '驅蟲紀錄已更新');
        navigation.replace('DewormingDetail', { recordId: response.record.id });
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
          <Ionicons name="shield-checkmark-outline" size={22} color={Colors.success} />
        </View>
        <View style={styles.formIntroCopy}>
          <Text style={styles.formEyebrow}>日常預防</Text>
          <Text style={styles.title}>{existing ? '編輯驅蟲紀錄' : '新增驅蟲紀錄'}</Text>
          <Text style={styles.formHint}>記下產品與使用日期，下一次安排更清楚。</Text>
        </View>
      </View>
      <Text style={styles.section}>驅蟲類型</Text>
      <View style={styles.options}>
        {(Object.keys(dewormingTypeLabels) as DewormingType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, draft.type === type && styles.selected]}
            onPress={() => setField('type', type)}
          >
            <Text>{dewormingTypeLabels[type]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {fields
        .filter(([key]) => key !== 'notes')
        .map(([key, label]) => {
          const isDate = key === 'administeredAt' || key === 'nextDueAt';
          if (isDate)
            return (
              <DatePickerField
                key={key}
                label={label}
                value={validDewormingDate(draft[key])}
                onChange={(date) => setField(key, toTaipeiDateValue(date))}
                minimumDate={
                  key === 'nextDueAt'
                    ? validDewormingDate(draft.administeredAt) || new Date()
                    : undefined
                }
                maximumDate={key === 'administeredAt' ? new Date() : undefined}
              />
            );
          return (
            <View key={key}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                placeholder={`請輸入${label.replace('（必填）', '')}`}
                placeholderTextColor={Colors.subtext}
                value={typeof draft[key] === 'string' ? draft[key] : ''}
                onChangeText={(value) => setField(key, value)}
              />
            </View>
          );
        })}
      <SupplementalNotesField
        value={String(draft.notes ?? '')}
        onChange={(value) => setField('notes', value)}
      />
      <AppButton
        title={saving ? '儲存中…' : '儲存'}
        variant="primary"
        disabled={saving}
        busy={saving}
        style={styles.primary}
        textStyle={styles.primaryText}
        onPress={save}
      />
    </KeyboardAwareScrollView>
  );
}
