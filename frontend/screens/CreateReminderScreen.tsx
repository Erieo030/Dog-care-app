import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：建立或編輯提醒；後端成功後同步裝置 Local Notification。 */
import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import SupplementalNotesField from '../components/SupplementalNotesField';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

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
import { RECURRENCE_RULES, REMINDER_TYPES } from '../constants/Reminders';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { useSettings } from '../contexts/SettingsContext';
import { HomeStackParamList } from '../navigation/types';
import {
  replaceReminderNotification,
  scheduleReminderNotification,
} from '../services/notificationService';
import { createReminder, updateReminder } from '../services/reminderService';
import { RecurrenceRule, ReminderType } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateReminder'>;

export default function CreateReminderScreen({ navigation, route }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const existing = route.params?.reminder;
  const quickEntry = route.params?.quickEntry === true;
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const { settings } = useSettings();
  const [type, setType] = useState<ReminderType>(existing?.type ?? 'other');
  const [title, setTitle] = useState(existing?.title ?? '提醒');
  const [scheduledAt, setScheduledAt] = useState(
    existing
      ? new Date(existing.scheduledAt)
      : (() => {
          const date = new Date();
          const [hour, minute] = settings.defaultReminderTime.split(':').map(Number);
          date.setHours(hour, minute, 0, 0);
          if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
          return date;
        })(),
  );
  const [rule, setRule] = useState<RecurrenceRule>(existing?.recurrenceRule ?? 'monthly');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [clientRequestId] = useState(
    () => `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );

  const chooseType = (item: (typeof REMINDER_TYPES)[number]) => {
    setType(item[0]);
    setTitle(item[1]);
    setRule(item[2]);
  };

  const submit = async () => {
    if (!selectedPet || !session?.userId || !title.trim() || submitting) {
      if (!title.trim()) Alert.alert('提示', '請填寫提醒名稱');
      return;
    }
    if (!Number.isFinite(scheduledAt.getTime())) return Alert.alert('提示', '提醒日期無效');
    if (scheduledAt.getTime() <= Date.now()) {
      Alert.alert('提醒時間已過', '請選擇晚於目前時間的日期與時間；同一天的未來時間可以使用。');
      return;
    }
    setSubmitting(true);
    try {
      const input = {
        type,
        title: title.trim(),
        scheduledAt: scheduledAt.toISOString(),
        recurrenceRule: rule,
        notes: notes.trim(),
        clientRequestId: existing ? undefined : clientRequestId,
      };
      const saved = existing
        ? await updateReminder(session.userId, existing.id, { ...input, status: existing.status })
        : await createReminder(session.userId, selectedPet.id, input);
      try {
        const result = existing
          ? await replaceReminderNotification(session.userId, saved, selectedPet.name)
          : await scheduleReminderNotification(session.userId, saved, selectedPet.name);
        const message =
          result.status === 'disabled'
            ? '提醒已儲存。MEGO 手機提醒已關閉，App 內提醒仍會保留。'
            : result.status === 'denied'
              ? '提醒已儲存。通知權限尚未開啟，你仍可以在 MEGO 內查看提醒。'
              : result.status === 'expired'
                ? '提醒已儲存；時間已過，不會排程手機通知。'
                : `提醒已儲存${existing ? '並重新排程' : '並排程手機通知'}。`;
        if (quickEntry) {
          showQuickRecordFeedback({
            message: `${message} 完整安排可到「紀錄」查看。`,
            onDone: () => navigation.popToTop(),
            onAddAnother: () => navigation.replace('CreateReminder', { quickEntry: true }),
          });
        } else {
          Alert.alert('已儲存', message, [{ text: '完成', onPress: navigation.goBack }]);
        }
      } catch {
        const notificationError = '提醒已儲存，但手機通知排程失敗，仍可在 App 內查看。';
        if (quickEntry) {
          showQuickRecordFeedback({
            message: notificationError,
            onDone: () => navigation.popToTop(),
            onAddAnother: () => navigation.replace('CreateReminder', { quickEntry: true }),
          });
        } else {
          Alert.alert('已儲存', notificationError, [{ text: '完成', onPress: navigation.goBack }]);
        }
      }
    } catch (error) {
      Alert.alert('儲存失敗', (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
      >
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.introCopy}>
            <Text style={styles.introTitle}>
              {existing ? '調整照護安排' : '安排下一件照護事項'}
            </Text>
            <Text style={styles.introHint}>完成後會保留在 App 內，並依通知設定提醒你。</Text>
          </View>
        </View>
        <Label text="提醒類型（必填）" />
        <View style={styles.chips}>
          {REMINDER_TYPES.map((item) => (
            <Chip
              key={item[0]}
              label={item[1]}
              active={type === item[0]}
              onPress={() => chooseType(item)}
            />
          ))}
        </View>
        <Label text="提醒名稱（必填）" />
        <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={100} />
        <DatePickerField
          label="提醒日期與時間（必填）"
          value={scheduledAt}
          mode="datetime"
          minimumDate={new Date()}
          disabled={submitting}
          onChange={setScheduledAt}
        />
        <Label text="是否重複（建議值，可自行調整）" />
        <View style={styles.chips}>
          {RECURRENCE_RULES.map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              active={rule === value}
              onPress={() => setRule(value)}
            />
          ))}
        </View>
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={17} color={Colors.success} />
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>頻率參考</Text>
            <Text style={styles.noticeText}>實際頻率請依獸醫建議與產品說明為準。</Text>
          </View>
        </View>
        <SupplementalNotesField value={notes} onChange={setNotes} maxLength={1000} />
        <AppButton
          title={submitting ? '儲存中…' : existing ? '儲存修改' : '建立提醒'}
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

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
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
    backgroundColor: Colors.primarySoft,
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 11,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
  input: {
    fontSize: FORM_FIELD_FONT_SIZE,
    minHeight: FORM_FIELD_HEIGHT,
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: FORM_FIELD_RADIUS,
    paddingHorizontal: FORM_FIELD_PADDING_HORIZONTAL,
    color: Colors.text,
  },
  inputText: { color: Colors.text },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
    padding: 11,
    borderRadius: 14,
    backgroundColor: Colors.successSoft,
  },
  noticeCopy: { flex: 1, gap: 2 },
  noticeTitle: { color: Colors.text, fontSize: 12, fontWeight: '800' },
  noticeText: { color: Colors.subtext, fontSize: 12, lineHeight: 17 },
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
