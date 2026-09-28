import React from 'react';
import { KeyboardTypeOptions, StyleSheet, Text, TextInput } from 'react-native';
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

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  maxLength?: number;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
};

export default function MedicalVisitTextField({
  label,
  value,
  onChangeText,
  maxLength = 2000,
  keyboardType,
  placeholder,
}: Props) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        keyboardType={keyboardType}
        placeholder={placeholder}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
});
