/** 用途：新增或編輯體重，驗證公斤數與有效測量日期並防止重複提交。 */
import React, { useState } from 'react';
import AttachmentPicker from '../components/AttachmentPicker';
import { ATTACHMENT_LIMITS } from '../constants/Attachments';
import { Alert, View, SafeAreaView, StyleSheet, Text, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import SupplementalNotesField from '../components/SupplementalNotesField';

import { Colors } from '../constants/Colors';
import {
  FORM_BUTTON_HEIGHT,
  FORM_BUTTON_RADIUS,
  FORM_FIELD_HEIGHT,
  FORM_FIELD_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_WEIGHT,
  FORM_FIELD_LABEL_MARGIN_BOTTOM,
  FORM_FIELD_LABEL_MARGIN_TOP,
  FORM_FIELD_PADDING_HORIZONTAL,
  FORM_FIELD_RADIUS,
  FORM_PAGE_HORIZONTAL_PADDING,
} from '../constants/FormTokens';
import DatePickerField from '../components/DatePickerField';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { showQuickRecordFeedback } from '../utils/quickRecordFeedback';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import * as service from '../services/weightService';

type Props = NativeStackScreenProps<HomeStackParamList, 'WeightForm'>;

export default function WeightFormScreen({ route, navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const record = route.params?.record;
  const quickEntry = route.params?.quickEntry === true;
  const { session } = useAuth();
  const { selectedPet, refreshPets } = usePet();
  const initialDate = record ? new Date(record.measuredAt) : new Date();
  const [weight, setWeight] = useState(record ? String(record.weightKg) : '');
  const [date, setDate] = useState(Number.isNaN(initialDate.getTime()) ? new Date() : initialDate);
  const [notes, setNotes] = useState(record?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState(record?.attachments ?? []);

  const submit = async () => {
    if (submitting) return;
    const normalizedWeight = weight.trim();
    const value = Number(normalizedWeight);
    if (
      !/^\d+(\.\d{1,2})?$/.test(normalizedWeight) ||
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 300
    ) {
      Alert.alert('請確認體重', '體重需大於 0、不超過 300 kg，且最多兩位小數。');
      return;
    }
    if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) {
      Alert.alert('請確認日期', '測量日期必須有效，且不可晚於今天。');
      return;
    }
    if (!session?.userId || (!record && !selectedPet)) {
      Alert.alert('儲存失敗', '找不到目前登入使用者或毛孩資料');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        weightKg: value,
        measuredAt: date.toISOString(),
        notes: notes.trim(),
        attachmentIds: attachments.map((item) => item.id),
      };
      if (record) {
        await service.updateWeight(session.userId, record.id, data);
      } else if (selectedPet) {
        await service.createWeight(session.userId, selectedPet.id, data);
      }
      await refreshPets();
      if (quickEntry) {
        showQuickRecordFeedback({
          message: '體重紀錄已儲存，完整趨勢可到「紀錄」查看。',
          onDone: () => navigation.popToTop(),
          onAddAnother: () => navigation.replace('WeightForm', { quickEntry: true }),
        });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('儲存失敗', (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
      >
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="scale-outline" size={20} color={Colors.success} />
          </View>
          <View style={styles.introCopy}>
            <Text style={styles.introTitle}>{record ? '更新這次測量' : '記下今天的體重'}</Text>
            <Text style={styles.introHint}>固定在相近條件下量測，更容易比較變化。</Text>
          </View>
        </View>
        <Text style={styles.label}>體重（kg）（必填）</Text>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="例如 8.2"
          editable={!submitting}
        />

        <DatePickerField
          label="測量日期（必填）"
          value={date}
          maximumDate={new Date()}
          disabled={submitting}
          onChange={setDate}
        />

        <SupplementalNotesField value={notes} onChange={setNotes} />

        {session?.userId && (selectedPet || record) && (
          <AttachmentPicker
            userId={session.userId}
            petId={record?.petId || selectedPet!.id}
            sourceType="weight"
            limit={ATTACHMENT_LIMITS.weight}
            value={attachments}
            onChange={setAttachments}
            disabled={submitting}
          />
        )}

        <AppButton
          title={submitting ? '儲存中…' : '儲存體重'}
          variant="primary"
          disabled={submitting}
          busy={submitting}
          style={[styles.submit, submitting && styles.disabled]}
          textStyle={styles.submitText}
          onPress={submit}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: FORM_PAGE_HORIZONTAL_PADDING, paddingTop: 18, paddingBottom: 34 },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 13,
  },
  introIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: { flex: 1, minWidth: 0 },
  introTitle: { color: Colors.text, fontSize: 16, fontWeight: '800' },
  introHint: { color: Colors.subtext, fontSize: 12, lineHeight: 17, marginTop: 2 },
  label: {
    color: Colors.text,
    fontSize: FORM_FIELD_LABEL_FONT_SIZE,
    fontWeight: FORM_FIELD_LABEL_FONT_WEIGHT,
    marginTop: FORM_FIELD_LABEL_MARGIN_TOP,
    marginBottom: FORM_FIELD_LABEL_MARGIN_BOTTOM,
  },
  input: {
    fontSize: FORM_FIELD_FONT_SIZE,
    minHeight: FORM_FIELD_HEIGHT,
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: FORM_FIELD_RADIUS,
    paddingHorizontal: FORM_FIELD_PADDING_HORIZONTAL,
    color: Colors.text,
  },
  submit: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: FORM_BUTTON_RADIUS,
    alignItems: 'center',
    marginTop: 25,
    minHeight: FORM_BUTTON_HEIGHT,
  },
  disabled: { opacity: 0.55 },
  submitText: { color: '#FFF', fontWeight: '800' },
});
