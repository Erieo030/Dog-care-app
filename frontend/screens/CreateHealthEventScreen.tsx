/** 用途：依異常類型呈現快速選項，支援時間、嚴重程度、圖片與備註。 */
import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
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
import AttachmentPicker from '../components/AttachmentPicker';
import { ATTACHMENT_LIMITS } from '../constants/Attachments';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import { createHealthEvent } from '../services/healthEventService';
import { Attachment, Severity } from '../types';
import {
  CreateHealthEventChoiceField,
  CreateHealthEventQuestions,
} from '../features/health-events/components/CreateHealthEventChoices';
import { CREATE_EVENT_SEVERITY_OPTIONS } from '../features/health-events/createHealthEventContent';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateHealthEvent'>;
export default function CreateHealthEventScreen({ route, navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const { type, label } = route.params;
  const quickEntry = route.params.quickEntry === true;
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [severity, setSeverity] = useState<Severity>('mild');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const submit = async () => {
    if (!selectedPet || !session?.userId || submitting) return;
    setSubmitting(true);
    try {
      await createHealthEvent(session.userId, selectedPet.id, {
        type,
        occurredAt: occurredAt.toISOString(),
        severity,
        summary: `${label}紀錄`,
        details,
        notes: notes.trim(),
        attachmentIds: images.map((item) => item.id),
      });
      const showSafetyNotice = () => {
        if (severity === 'severe')
          Alert.alert(
            '安全提醒',
            '如果毛孩持續惡化、反覆嘔吐、呼吸困難、昏倒、大量出血或無法飲水，請立即聯絡動物醫院。',
          );
      };
      if (quickEntry) {
        showQuickRecordFeedback({
          message:
            severity === 'severe'
              ? '健康觀察已儲存。若毛孩持續惡化、反覆嘔吐、呼吸困難、昏倒、大量出血或無法飲水，請立即聯絡動物醫院。完整內容可到「紀錄」查看。'
              : '健康觀察已儲存，完整內容可到「紀錄」查看。',
          onDone: () => navigation.popToTop(),
          onAddAnother: () => navigation.replace('AbnormalType', { quickEntry: true }),
        });
      } else {
        Alert.alert('已儲存', '異常紀錄已加入近期動態', [
          {
            text: '完成',
            onPress: () => {
              showSafetyNotice();
              navigation.popToTop();
            },
          },
        ]);
      }
    } catch (e) {
      Alert.alert('儲存失敗', (e as Error).message);
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
            <Ionicons name="pulse-outline" size={22} color={Colors.primary} />
          </View>
          <View style={styles.introCopy}>
            <Text style={styles.title}>{label}</Text>
            <Text style={styles.subtitle}>記下看見的狀況，方便日後回看。</Text>
          </View>
        </View>
        <CreateHealthEventQuestions
          type={type}
          details={details}
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced((value) => !value)}
          onChange={(field, value) => setDetails((current) => ({ ...current, [field]: value }))}
        />
        <CreateHealthEventChoiceField
          label="嚴重程度（必填）"
          values={CREATE_EVENT_SEVERITY_OPTIONS.map(([, label]) => label)}
          value={CREATE_EVENT_SEVERITY_OPTIONS.find(([value]) => value === severity)?.[1]}
          onChange={(label) => {
            const value = CREATE_EVENT_SEVERITY_OPTIONS.find(([, text]) => text === label)?.[0];
            if (value) setSeverity(value);
          }}
        />
        <DatePickerField
          label="發生日期（必填）"
          value={occurredAt}
          mode="date"
          maximumDate={new Date()}
          disabled={submitting}
          onChange={setOccurredAt}
        />
        <AttachmentPicker
          userId={session!.userId}
          petId={selectedPet!.id}
          sourceType="health_event"
          limit={ATTACHMENT_LIMITS.health_event}
          value={images}
          onChange={setImages}
          disabled={submitting}
        />
        <SupplementalNotesField value={notes} onChange={setNotes} placeholder="只需補充重要資訊" />
        <AppButton
          title={submitting ? '儲存中…' : '儲存紀錄'}
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
  intro: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 7 },
  introIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: { flex: 1, minWidth: 0 },
  title: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: Colors.subtext, lineHeight: 18, marginTop: 2, fontSize: 12 },
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
  notes: { minHeight: 90, paddingTop: 13, textAlignVertical: 'top' },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  image: { width: 70, height: 70, borderRadius: 12 },
  outline: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 18,
    padding: 13,
    alignItems: 'center',
  },
  outlineText: { color: Colors.text, fontWeight: '700' },
  submit: {
    backgroundColor: Colors.primary,
    borderRadius: FORM_BUTTON_RADIUS,
    padding: 14,
    minHeight: FORM_BUTTON_HEIGHT,
    alignItems: 'center',
    marginTop: 25,
  },
  submitText: { color: '#FFF', fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
