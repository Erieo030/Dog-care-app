import { SafeAreaView } from 'react-native-safe-area-context';
/** 毛孩新增與編輯共用表單，集中處理欄位驗證與健康資料輸入。 */
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '../constants/Colors';
import {
  FORM_BUTTON_HEIGHT,
  FORM_BUTTON_RADIUS,
  FORM_FIELD_LABEL_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_WEIGHT,
  FORM_FIELD_LABEL_MARGIN_BOTTOM,
  FORM_PAGE_HORIZONTAL_PADDING,
} from '../constants/FormTokens';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import { emptyPetData, PetData } from '../types';
import { useAuth } from '../contexts/AuthContext';
import PetAvatarPicker from '../features/pets/components/PetAvatarPicker';
import PetFormTextField from '../features/pets/components/PetFormTextField';
import {
  PET_FORM_FIELDS,
  PetFormTextField as PetFormTextFieldData,
} from '../features/pets/petFormContent';

interface PetFormScreenProps {
  title: string;
  submitLabel: string;
  initialData?: PetData;
  onSubmit: (data: PetData) => Promise<void> | void;
  onCancel?: () => void;
  bottomContentPadding?: number;
}

export default function PetFormScreen({
  title,
  submitLabel,
  initialData,
  onSubmit,
  onCancel,
  bottomContentPadding,
}: PetFormScreenProps) {
  const { session } = useAuth();
  const [form, setForm] = useState<PetData>({ ...emptyPetData, ...initialData });
  const [saving, setSaving] = useState(false);
  const update = <K extends keyof PetData>(key: K, value: PetData[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (saving) return;
    if (!form.name.trim() || !form.gender || !form.breed.trim() || !form.arrivalDate.trim()) {
      Alert.alert('提示', '請填寫姓名、性別、品種與到家日期');
      return;
    }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (form.birthday && !datePattern.test(form.birthday)) {
      Alert.alert('提示', '出生日期請使用 YYYY-MM-DD 格式');
      return;
    }
    if (form.arrivalDate && !datePattern.test(form.arrivalDate)) {
      Alert.alert('提示', '到家日期請使用 YYYY-MM-DD 格式');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        gender: form.gender,
        breed: form.breed.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  const renderFields = (items: PetFormTextFieldData[]) =>
    items.map((field) => (
      <PetFormTextField
        key={field.key}
        field={field}
        value={form[field.key]}
        onChange={(value) => update(field.key, value)}
      />
    ));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            bottomContentPadding !== undefined && { paddingBottom: bottomContentPadding },
          ]}
        >
          <View style={styles.formIntro}>
            <View style={styles.formIntroIcon}>
              <Ionicons name="paw" size={23} color={Colors.primary} />
            </View>
            <View style={styles.formIntroCopy}>
              <Text style={styles.formEyebrow}>毛孩資料</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.formHint}>先完成基本資料，日後照護紀錄會更貼近牠。</Text>
            </View>
          </View>

          <PetAvatarPicker
            avatarUri={form.avatarUri}
            avatarAttachmentId={form.avatarAttachmentId}
            userId={session?.userId}
            onChange={(uri) => update('avatarUri', uri)}
            onAttachmentChange={(attachmentId) => update('avatarAttachmentId', attachmentId)}
          />

          <Text style={styles.sectionHeading}>基本資料</Text>
          {renderFields(PET_FORM_FIELDS.slice(0, 2))}
          <Text style={styles.label}>性別（必填）</Text>
          <View style={styles.optionRow}>
            {(
              [
                ['male', '公'],
                ['female', '母'],
              ] as const
            ).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[styles.option, form.gender === value && styles.optionSelected]}
                onPress={() => update('gender', value)}
              >
                <Text
                  style={[styles.optionText, form.gender === value && styles.optionTextSelected]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>品種類型（必填）</Text>
          <View style={styles.optionRow}>
            {(
              [
                ['purebred', '純種'],
                ['mixed', '混種'],
                ['unknown', '不確定'],
              ] as const
            ).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[styles.option, form.breedType === value && styles.optionSelected]}
                onPress={() => update('breedType', value)}
              >
                <Text
                  style={[styles.optionText, form.breedType === value && styles.optionTextSelected]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionHeading}>生活資訊</Text>
          {renderFields(PET_FORM_FIELDS.slice(2, 4))}

          <Text style={styles.sectionHeading}>健康備註</Text>
          <Text style={styles.sectionHint}>有過敏或慢性病時，AI 整理與就醫前摘要會一併參考。</Text>
          {renderFields(PET_FORM_FIELDS.slice(4, 6))}

          <Text style={styles.sectionHeading}>身份資訊</Text>
          <Text style={styles.sectionHint}>選填。可用於毛孩身份卡與 QR 身份頁。</Text>
          {renderFields(PET_FORM_FIELDS.slice(6))}
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>結紮狀態</Text>
              <Text style={styles.hint}>{form.neutered ? '已結紮' : '未結紮'}</Text>
            </View>
            <Switch
              value={form.neutered}
              onValueChange={(value) => update('neutered', value)}
              trackColor={{ true: Colors.primary }}
            />
          </View>

          <AppButton
            title={saving ? (form.avatarUri ? '正在上傳照片並儲存…' : '正在儲存…') : submitLabel}
            variant="primary"
            busy={saving}
            style={styles.submitButton}
            textStyle={styles.submitText}
            onPress={submit}
          />
          {onCancel && (
            <AppButton
              title="取消"
              variant="secondary"
              disabled={saving}
              style={styles.cancelButton}
              textStyle={styles.cancelText}
              onPress={onCancel}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: FORM_PAGE_HORIZONTAL_PADDING, paddingTop: 18, paddingBottom: 48 },
  formIntro: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  formIntroIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  formIntroCopy: { flex: 1 },
  formEyebrow: { color: Colors.primary, fontSize: 13, fontWeight: '800', marginBottom: 2 },
  formHint: { color: Colors.subtext, fontSize: 13, lineHeight: 19, marginTop: 3 },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  sectionHeading: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 3,
  },
  sectionHint: { color: Colors.subtext, fontSize: 12, lineHeight: 18, marginBottom: 2 },
  label: {
    color: Colors.text,
    fontWeight: FORM_FIELD_LABEL_FONT_WEIGHT,
    marginBottom: FORM_FIELD_LABEL_MARGIN_BOTTOM,
    fontSize: FORM_FIELD_LABEL_FONT_SIZE,
  },
  optionRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  option: {
    flex: 1,
    minHeight: FORM_BUTTON_HEIGHT,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  optionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { color: Colors.text, fontWeight: '700' },
  optionTextSelected: { color: '#FFF' },
  hint: { color: Colors.subtext, fontSize: 12 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    minHeight: FORM_BUTTON_HEIGHT,
    borderRadius: FORM_BUTTON_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  cancelButton: { alignItems: 'center', padding: 18 },
  cancelText: { color: Colors.subtext, fontWeight: '600' },
});
