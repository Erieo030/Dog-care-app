/** 用途：建立或編輯提醒；後端成功後同步裝置 Local Notification。 */
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '../constants/Colors';
import { RECURRENCE_RULES, REMINDER_TYPES } from '../constants/Reminders';
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
  const existing = route.params?.reminder;
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const { settings } = useSettings();
  const [type, setType] = useState<ReminderType>(existing?.type ?? 'heartworm');
  const [title, setTitle] = useState(existing?.title ?? '心絲蟲預防');
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
  const [showPicker, setShowPicker] = useState(false);
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
            ? '提醒已儲存。PawLog 手機提醒已關閉，App 內提醒仍會保留。'
            : result.status === 'denied'
              ? '提醒已儲存。通知權限尚未開啟，你仍可以在 PawLog 內查看提醒。'
              : result.status === 'expired'
                ? '提醒已儲存；時間已過，不會排程手機通知。'
                : `提醒已儲存${existing ? '並重新排程' : '並排程手機通知'}。`;
        Alert.alert('已儲存', message, [{ text: '完成', onPress: navigation.goBack }]);
      } catch {
        Alert.alert('已儲存', '提醒已儲存，但手機通知排程失敗，仍可在 App 內查看。', [
          { text: '完成', onPress: navigation.goBack },
        ]);
      }
    } catch (error) {
      Alert.alert('儲存失敗', (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Label text="提醒類型 *" />
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
        <Label text="提醒名稱 *" />
        <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={100} />
        <Label text="提醒日期與時間 *" />
        <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
          <Text style={styles.inputText}>{scheduledAt.toLocaleString('zh-TW')}</Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={scheduledAt}
            mode="datetime"
            minimumDate={new Date()}
            onChange={(_, date) => {
              setShowPicker(Platform.OS === 'ios');
              if (date) setScheduledAt(date);
            }}
          />
        )}
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
        <Text style={styles.notice}>實際頻率請依獸醫建議與產品說明為準。</Text>
        <Label text="備註（選填）" />
        <TextInput
          style={[styles.input, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          maxLength={1000}
          multiline
        />
        <TouchableOpacity
          disabled={submitting}
          style={[styles.submit, submitting && styles.disabled]}
          onPress={submit}
        >
          <Text style={styles.submitText}>
            {submitting ? '儲存中…' : existing ? '儲存修改' : '建立提醒'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  content: { padding: 20, paddingBottom: 50 },
  label: { color: Colors.text, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  chipText: { color: Colors.text },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
  input: {
    minHeight: 54,
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: Colors.text,
  },
  inputText: { color: Colors.text },
  multiline: { height: 90, paddingTop: 13, textAlignVertical: 'top' },
  notice: { color: Colors.subtext, fontSize: 12, marginTop: 10 },
  submit: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 25,
  },
  submitText: { color: '#FFF', fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
