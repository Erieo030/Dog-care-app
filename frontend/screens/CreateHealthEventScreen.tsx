/** 用途：依異常類型呈現快速選項，支援時間、嚴重程度、圖片與備註。 */
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
import AttachmentPicker from '../components/AttachmentPicker';
import { ATTACHMENT_LIMITS } from '../constants/Attachments';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import { createHealthEvent } from '../services/healthEventService';
import { Attachment, Severity } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateHealthEvent'>;
const severityOptions: Array<[Severity, string]> = [
  ['mild', '輕微'],
  ['moderate', '需要注意'],
  ['severe', '嚴重'],
];

export default function CreateHealthEventScreen({ route, navigation }: Props) {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const { type, label } = route.params;
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [severity, setSeverity] = useState<Severity>('mild');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<Attachment[]>([]);
  const [showTime, setShowTime] = useState(false);
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
      Alert.alert('已儲存', '異常紀錄已加入近期動態', [
        {
          text: '完成',
          onPress: () => {
            if (severity === 'severe')
              Alert.alert(
                '安全提醒',
                '如果毛孩持續惡化、反覆嘔吐、呼吸困難、昏倒、大量出血或無法飲水，請立即聯絡動物醫院。',
              );
            navigation.popToTop();
          },
        },
      ]);
    } catch (e) {
      Alert.alert('儲存失敗', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{label}</Text>
        {type === 'vomiting' && (
          <>
            <QuickField
              label="發生幾次？"
              field="count"
              values={['1 次', '2～3 次', '4 次以上']}
              state={details}
              setState={setDetails}
            />
            <QuickField
              label="精神狀況？"
              field="energy"
              values={['正常', '稍差', '很差']}
              state={details}
              setState={setDetails}
            />
            <TouchableOpacity
              style={styles.advancedButton}
              onPress={() => setShowAdvanced((value) => !value)}
            >
              <Text style={styles.advancedText}>
                {showAdvanced ? '收合補充資訊' : '補充更多資訊'}
              </Text>
            </TouchableOpacity>
            {showAdvanced && (
              <>
                <QuickField
                  label="顏色"
                  field="color"
                  values={['透明', '黃色', '褐色', '紅色', '其他']}
                  state={details}
                  setState={setDetails}
                />
                <QuickField
                  label="內容物"
                  field="contents"
                  values={['有泡沫', '有食物', '疑似有血', '疑似有異物']}
                  state={details}
                  setState={setDetails}
                />
                <QuickField
                  label="是否能正常喝水"
                  field="canDrink"
                  values={['可以', '不太能', '完全不能']}
                  state={details}
                  setState={setDetails}
                />
              </>
            )}
          </>
        )}
        {type === 'abnormal_stool' && (
          <>
            <QuickField
              label="形狀"
              field="shape"
              values={['偏軟', '水狀', '很硬', '其他']}
              state={details}
              setState={setDetails}
            />
            <QuickField
              label="顏色"
              field="color"
              values={['一般', '黃色', '綠色', '黑色', '紅色']}
              state={details}
              setState={setDetails}
            />
            <QuickField
              label="其他"
              field="other"
              values={['黏液', '疑似血液', '異物', '疑似蟲體']}
              state={details}
              setState={setDetails}
            />
          </>
        )}
        {type === 'low_appetite' && (
          <QuickField
            label="食慾狀況"
            field="level"
            values={['少吃一些', '吃不到一半', '完全不吃']}
            state={details}
            setState={setDetails}
          />
        )}
        {type === 'low_energy' && (
          <QuickField
            label="精神狀況"
            field="level"
            values={['稍微沒精神', '明顯沒精神', '幾乎不活動']}
            state={details}
            setState={setDetails}
          />
        )}
        <Text style={styles.label}>嚴重程度 *</Text>
        <View style={styles.chips}>
          {severityOptions.map(([value, text]) => (
            <Chip
              key={value}
              text={text}
              active={severity === value}
              onPress={() => setSeverity(value)}
            />
          ))}
        </View>
        <Text style={styles.label}>發生時間 *</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowTime(true)}>
          <Text style={styles.inputText}>{occurredAt.toLocaleString('zh-TW')}</Text>
        </TouchableOpacity>
        {showTime && (
          <DateTimePicker
            value={occurredAt}
            mode="datetime"
            maximumDate={new Date()}
            onChange={(_, value) => {
              setShowTime(Platform.OS === 'ios');
              if (value) setOccurredAt(value);
            }}
          />
        )}
        <AttachmentPicker
          userId={session!.userId}
          petId={selectedPet!.id}
          sourceType="health_event"
          limit={ATTACHMENT_LIMITS.health_event}
          value={images}
          onChange={setImages}
          disabled={submitting}
        />
        <Text style={styles.label}>備註（選填）</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="只需補充重要資訊"
          placeholderTextColor={Colors.subtext}
        />
        <TouchableOpacity
          disabled={submitting}
          style={[styles.submit, submitting && styles.disabled]}
          onPress={submit}
        >
          <Text style={styles.submitText}>{submitting ? '儲存中…' : '儲存紀錄'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickField({
  label,
  field,
  values,
  state,
  setState,
}: {
  label: string;
  field: string;
  values: string[];
  state: Record<string, string>;
  setState: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {values.map((value) => (
          <Chip
            key={value}
            text={value}
            active={state[field] === value}
            onPress={() => setState((current) => ({ ...current, [field]: value }))}
          />
        ))}
      </View>
    </>
  );
}
function Chip({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{text}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 50 },
  title: { color: Colors.text, fontSize: 26, fontWeight: '800', marginBottom: 8 },
  label: { color: Colors.text, fontWeight: '700', marginTop: 17, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  chipActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  chipText: { color: Colors.text },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
  input: {
    minHeight: 54,
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: Colors.text,
  },
  inputText: { color: Colors.text },
  notes: { minHeight: 90, paddingTop: 13, textAlignVertical: 'top' },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  image: { width: 70, height: 70, borderRadius: 12 },
  advancedButton: { paddingVertical: 12 },
  advancedText: { color: Colors.primary, fontWeight: '700' },
  outline: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 14,
    padding: 13,
    alignItems: 'center',
  },
  outlineText: { color: Colors.text, fontWeight: '700' },
  submit: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 14,
    minHeight: 52,
    alignItems: 'center',
    marginTop: 25,
  },
  submitText: { color: '#FFF', fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
