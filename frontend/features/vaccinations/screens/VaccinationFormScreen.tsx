/** 用途：新增、編輯與複製疫苗紀錄。 */
import React, { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
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
import { createVaccination, updateVaccination } from '../../../services/vaccinationService';
import type { Vaccination } from '../../../types';
import { vaccinationStyles as styles } from '../vaccinationStyles';
import { createBlankVaccinationDraft, validVaccinationDate, type VaccinationDraft } from '../types';
import { toTaipeiDateValue } from '../../../utils/taipeiDate';
const fields = [
  ['vaccineName', '疫苗名稱（必填）'],
  ['administeredAt', '接種日期（必填）'],
  ['hospitalName', '醫院'],
  ['nextDueAt', '下次接種日期（選填，需晚於接種日期）'],
  ['notes', '補充備註'],
] as const;
export function VaccinationFormScreen() {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const route = useRoute<RouteProp<HomeStackParamList, 'VaccinationForm'>>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const existing = route.params?.record as Vaccination | undefined;
  const duplicate = route.params?.duplicate === true;
  const quickEntry = route.params?.quickEntry === true;
  const [draft, setDraft] = useState<VaccinationDraft>({
    ...createBlankVaccinationDraft(),
    ...(existing || {}),
  });
  const [saving, setSaving] = useState(false);
  const setField = <Key extends keyof VaccinationDraft>(key: Key, value: VaccinationDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (!session?.userId || !selectedPet || saving) return;
    if (!draft.vaccineName.trim()) return Alert.alert('請填寫疫苗名稱');
    const administered = validVaccinationDate(draft.administeredAt);
    const nextDue = draft.nextDueAt ? validVaccinationDate(draft.nextDueAt) : undefined;
    if (!administered || (draft.nextDueAt && !nextDue))
      return Alert.alert('日期錯誤', '請選擇有效的接種日期。');
    if (nextDue && nextDue < administered)
      return Alert.alert('日期順序錯誤', '下次接種日期不能早於接種日期。');
    setSaving(true);
    try {
      const payload = {
        vaccineName: draft.vaccineName.trim(),
        administeredAt: draft.administeredAt,
        hospitalName: draft.hospitalName.trim(),
        nextDueAt: draft.nextDueAt || null,
        notes: draft.notes.trim(),
        attachmentIds: draft.attachmentIds || [],
        createReminder: draft.createReminder,
      };
      const response =
        existing && !duplicate
          ? await updateVaccination(session.userId, existing.id, payload)
          : await createVaccination(session.userId, selectedPet.id, payload);
      if (quickEntry) {
        showQuickRecordFeedback({
          message: '疫苗紀錄已儲存，完整內容可到「紀錄」查看。',
          onDone: () => navigation.popToTop(),
          onAddAnother: () => navigation.replace('VaccinationForm', { quickEntry: true }),
        });
      } else {
        Alert.alert('已儲存', '疫苗紀錄已更新');
        navigation.replace('VaccinationDetail', { recordId: response.record.id });
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
          <Ionicons name="medkit-outline" size={22} color={Colors.success} />
        </View>
        <View style={styles.formIntroCopy}>
          <Text style={styles.formEyebrow}>接種照護</Text>
          <Text style={styles.title}>{existing ? '編輯疫苗' : '新增疫苗'}</Text>
          <Text style={styles.formHint}>保留接種日期與下次安排，日後更容易回看。</Text>
        </View>
      </View>
      {fields
        .filter(([key]) => key !== 'notes')
        .map(([key, label]) => {
          const isDate = key === 'administeredAt' || key === 'nextDueAt';
          if (isDate)
            return (
              <DatePickerField
                key={`${key}-${String(draft[key])}`}
                label={label}
                value={validVaccinationDate(draft[key])}
                onChange={(date) => setField(key, toTaipeiDateValue(date))}
                minimumDate={
                  key === 'nextDueAt'
                    ? validVaccinationDate(draft.administeredAt) || new Date()
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
