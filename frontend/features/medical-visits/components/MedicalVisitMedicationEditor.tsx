import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RecordActionButton } from '../../../components/RecordActionButton';
import SupplementalNotesField from '../../../components/SupplementalNotesField';
import DatePickerField from '../../../components/DatePickerField';
import { Colors } from '../../../constants/Colors';
import {
  FORM_FIELD_FONT_SIZE,
  FORM_FIELD_HEIGHT,
  FORM_FIELD_LABEL_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_WEIGHT,
  FORM_FIELD_LABEL_MARGIN_BOTTOM,
  FORM_FIELD_LABEL_MARGIN_TOP,
  FORM_FIELD_PADDING_HORIZONTAL,
  FORM_FIELD_RADIUS,
} from '../../../constants/FormTokens';
import { Medication } from '../../../types';
import { formatLocalDate, parseLocalDate } from '../medicalVisitContent';
import MedicalVisitTextField from './MedicalVisitTextField';

type Props = {
  medication: Medication;
  index: number;
  onUpdate: (key: keyof Medication, value: string | number) => void;
  onRemove: () => void;
};

export default function MedicalVisitMedicationEditor({
  medication,
  index,
  onUpdate,
  onRemove,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>藥物 {index + 1}</Text>
        <RecordActionButton
          kind="delete"
          label="刪除"
          style={styles.removeButton}
          onPress={onRemove}
        />
      </View>
      <MedicalVisitTextField
        label="藥袋／藥品名稱（新增用藥時必填）"
        value={medication.name}
        onChangeText={(value) => onUpdate('name', value)}
        maxLength={100}
      />
      <MedicalVisitTextField
        label="服用方式（選填）"
        value={medication.instructions}
        onChangeText={(value) => onUpdate('instructions', value)}
        maxLength={500}
      />
      <Text style={styles.label}>每日次數（選填）</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={String(medication.timesPerDay)}
        onChangeText={(value) => onUpdate('timesPerDay', Number(value))}
      />
      <DatePickerField
        label="開始日期"
        value={medication.startDate ? parseLocalDate(medication.startDate) : undefined}
        onChange={(date) => onUpdate('startDate', formatLocalDate(date))}
      />
      <DatePickerField
        label="結束日期"
        value={medication.endDate ? parseLocalDate(medication.endDate) : undefined}
        minimumDate={medication.startDate ? parseLocalDate(medication.startDate) : undefined}
        onChange={(date) => onUpdate('endDate', formatLocalDate(date))}
      />
      <Text style={styles.label}>飯前／飯後（選填）</Text>
      <View style={styles.mealRow}>
        {(
          [
            ['before', '飯前'],
            ['after', '飯後'],
            ['any', '不限'],
          ] as const
        ).map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[styles.meal, medication.mealTiming === value && styles.mealActive]}
            onPress={() => onUpdate('mealTiming', value)}
          >
            <Text style={styles.inputText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <SupplementalNotesField
        value={medication.notes}
        onChange={(value) => onUpdate('notes', value)}
        maxLength={500}
        placeholder="補充藥物使用時需要記下的內容"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    minHeight: FORM_FIELD_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: Colors.text, fontWeight: '800' },
  removeButton: {
    alignSelf: 'flex-start',
  },
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
  inputText: { color: Colors.text },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meal: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceSoft,
  },
  mealActive: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
});
