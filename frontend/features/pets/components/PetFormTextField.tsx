import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import DatePickerField from '../../../components/DatePickerField';
import SupplementalNotesField from '../../../components/SupplementalNotesField';
import { Colors } from '../../../constants/Colors';
import {
  FORM_FIELD_GAP,
  FORM_FIELD_HEIGHT,
  FORM_FIELD_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_WEIGHT,
  FORM_FIELD_LABEL_MARGIN_BOTTOM,
  FORM_FIELD_PADDING_HORIZONTAL,
  FORM_FIELD_RADIUS,
} from '../../../constants/FormTokens';
import type { PetFormTextField as PetFormTextFieldData } from '../petFormContent';
import { localDateKey } from '../../../utils/taipeiDate';

type Props = {
  field: PetFormTextFieldData;
  value: string;
  onChange: (value: string) => void;
};

export default function PetFormTextField({ field, value, onChange }: Props) {
  const isDate = field.key === 'birthday' || field.key === 'arrivalDate';

  return (
    <View style={styles.fieldGroup}>
      {isDate ? (
        <>
          <Text style={styles.label}>{field.label}</Text>
          <DatePickerField
            label=""
            value={value ? new Date(`${value}T12:00:00`) : undefined}
            placeholder={field.placeholder}
            onChange={(date) => onChange(localDateKey(date))}
            maximumDate={new Date()}
          />
        </>
      ) : field.multiline ? (
        <SupplementalNotesField
          label={field.label}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
        />
      ) : (
        <>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            placeholder={field.placeholder}
            placeholderTextColor={Colors.subtext}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { marginBottom: FORM_FIELD_GAP },
  label: {
    color: Colors.text,
    fontWeight: FORM_FIELD_LABEL_FONT_WEIGHT,
    marginBottom: FORM_FIELD_LABEL_MARGIN_BOTTOM,
    fontSize: FORM_FIELD_LABEL_FONT_SIZE,
  },
  input: {
    fontSize: FORM_FIELD_FONT_SIZE,
    minHeight: FORM_FIELD_HEIGHT,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8DDD4',
    backgroundColor: Colors.surface,
    borderRadius: FORM_FIELD_RADIUS,
    paddingHorizontal: FORM_FIELD_PADDING_HORIZONTAL,
    color: Colors.text,
  },
});
