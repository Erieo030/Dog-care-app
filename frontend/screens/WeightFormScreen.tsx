/** 用途：新增或編輯體重，驗證公斤數與有效測量日期並防止重複提交。 */
import React, { useState } from 'react';
import AttachmentPicker from '../components/AttachmentPicker';
import { ATTACHMENT_LIMITS } from '../constants/Attachments';
import {
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import * as service from '../services/weightService';

type Props = NativeStackScreenProps<HomeStackParamList, 'WeightForm'>;

export default function WeightFormScreen({ route, navigation }: Props) {
  const record = route.params?.record;
  const { session } = useAuth();
  const { selectedPet, refreshPets } = usePet();
  const initialDate = record ? new Date(record.measuredAt) : new Date();
  const [weight, setWeight] = useState(record ? String(record.weightKg) : '');
  const [date, setDate] = useState(Number.isNaN(initialDate.getTime()) ? new Date() : initialDate);
  const [notes, setNotes] = useState(record?.notes || '');
  const [show, setShow] = useState(false);
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
        attachmentIds: attachments
          .filter((item) => item.storageProvider !== 'legacy_local')
          .map((item) => item.id),
      };
      if (record) {
        await service.updateWeight(session.userId, record.id, data);
      } else if (selectedPet) {
        await service.createWeight(session.userId, selectedPet.id, data);
      }
      await refreshPets();
      navigation.goBack();
    } catch (error) {
      Alert.alert('儲存失敗', (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>體重（kg）*</Text>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="例如 8.2"
          editable={!submitting}
        />

        <Text style={styles.label}>測量日期 *</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShow(true)} disabled={submitting}>
          <Text>{date.toLocaleDateString('zh-TW')}</Text>
        </TouchableOpacity>
        {show && (
          <DateTimePicker
            value={date}
            mode="date"
            maximumDate={new Date()}
            onChange={(_, value) => {
              setShow(Platform.OS === 'ios');
              if (value) setDate(value);
            }}
          />
        )}

        <Text style={styles.label}>備註（選填）</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          multiline
          editable={!submitting}
        />

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

        <TouchableOpacity
          disabled={submitting}
          style={[styles.submit, submitting && styles.disabled]}
          onPress={submit}
        >
          <Text style={styles.submitText}>{submitting ? '儲存中…' : '儲存體重'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 22 },
  label: { color: Colors.text, fontWeight: '700', marginTop: 15, marginBottom: 8 },
  input: {
    minHeight: 55,
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: Colors.text,
  },
  notes: { height: 90, paddingTop: 14, textAlignVertical: 'top' },
  submit: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 25,
  },
  disabled: { opacity: 0.55 },
  submitText: { color: '#FFF', fontWeight: '800' },
});
