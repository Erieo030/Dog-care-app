import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../../constants/Colors';
import {
  FORM_FIELD_LABEL_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_WEIGHT,
  FORM_FIELD_LABEL_MARGIN_BOTTOM,
  FORM_FIELD_LABEL_MARGIN_TOP,
} from '../../../constants/FormTokens';
import {
  getCreateHealthEventQuestions,
  HealthEventQuickQuestion,
} from '../createHealthEventContent';
import { HealthEventType } from '../../../types';

type ChoiceFieldProps = {
  label: string;
  values: readonly string[];
  value?: string;
  onChange: (value: string) => void;
};

export function CreateHealthEventChoiceField({ label, values, value, onChange }: ChoiceFieldProps) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {values.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.chip, value === option && styles.chipActive]}
            onPress={() => onChange(option)}
          >
            <Text style={[styles.chipText, value === option && styles.chipTextActive]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

type QuestionsProps = {
  type: HealthEventType;
  details: Record<string, string>;
  showAdvanced: boolean;
  onChange: (field: string, value: string) => void;
  onToggleAdvanced: () => void;
};

export function CreateHealthEventQuestions({
  type,
  details,
  showAdvanced,
  onChange,
  onToggleAdvanced,
}: QuestionsProps) {
  const questions = getCreateHealthEventQuestions(type, showAdvanced);
  if (!questions.length) return null;

  const basicQuestionCount = type === 'vomiting' ? 2 : questions.length;
  return (
    <>
      {questions.slice(0, basicQuestionCount).map((question) => (
        <Question key={question.field} question={question} details={details} onChange={onChange} />
      ))}
      {type === 'vomiting' ? (
        <>
          <TouchableOpacity style={styles.advancedButton} onPress={onToggleAdvanced}>
            <Text style={styles.advancedText}>
              {showAdvanced ? '收合補充資訊' : '補充更多資訊'}
            </Text>
          </TouchableOpacity>
          {showAdvanced
            ? questions
                .slice(basicQuestionCount)
                .map((question) => (
                  <Question
                    key={question.field}
                    question={question}
                    details={details}
                    onChange={onChange}
                  />
                ))
            : null}
        </>
      ) : null}
    </>
  );
}

function Question({
  question,
  details,
  onChange,
}: {
  question: HealthEventQuickQuestion;
  details: Record<string, string>;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <CreateHealthEventChoiceField
      label={question.label}
      values={question.values}
      value={details[question.field]}
      onChange={(value) => onChange(question.field, value)}
    />
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text, fontWeight: '700' },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
  advancedButton: { paddingVertical: 12 },
  advancedText: { color: Colors.primary, fontWeight: '700' },
});
