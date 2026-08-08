/** 毛孩新增與編輯共用表單，集中處理欄位驗證與健康資料輸入。 */
import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '../constants/Colors';
import { emptyPetData, PetData } from '../types';

interface PetFormScreenProps {
  title: string;
  submitLabel: string;
  initialData?: PetData;
  onSubmit: (data: PetData) => void;
  onCancel?: () => void;
}

export default function PetFormScreen({
  title,
  submitLabel,
  initialData,
  onSubmit,
  onCancel,
}: PetFormScreenProps) {
  const [form, setForm] = useState<PetData>({ ...emptyPetData, ...initialData });
  const update = <K extends keyof PetData>(key: K, value: PetData[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = () => {
    if (!form.name.trim() || !form.gender.trim() || !form.breed.trim()) {
      Alert.alert('提示', '請填寫姓名、性別與品種');
      return;
    }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(form.birthday)) {
      Alert.alert('提示', '出生日期請使用 YYYY-MM-DD 格式');
      return;
    }
    if (form.arrivalDate && !datePattern.test(form.arrivalDate)) {
      Alert.alert('提示', '到家日期請使用 YYYY-MM-DD 格式');
      return;
    }
    onSubmit({
      ...form,
      name: form.name.trim(),
      gender: form.gender.trim(),
      breed: form.breed.trim(),
    });
  };

  const fields: Array<{
    key: keyof PetData;
    label: string;
    placeholder: string;
    multiline?: boolean;
  }> = [
    { key: 'name', label: '毛孩姓名 *', placeholder: '例如：Kuro' },
    { key: 'gender', label: '性別 *', placeholder: '例如：公犬' },
    { key: 'breed', label: '品種 *', placeholder: '例如：柴犬' },
    { key: 'birthday', label: '出生日期 *', placeholder: 'YYYY-MM-DD' },
    { key: 'arrivalDate', label: '到家日期', placeholder: 'YYYY-MM-DD' },
    { key: 'avatarUri', label: '頭像圖片網址', placeholder: 'https://...' },
    { key: 'allergies', label: '過敏資訊', placeholder: '沒有可留空', multiline: true },
    {
      key: 'chronicDiseases',
      label: '慢性病',
      placeholder: '沒有可留空',
      multiline: true,
    },
    { key: 'microchipNumber', label: '晶片號碼（選填）', placeholder: '可留空' },
    { key: 'coatColor', label: '毛色（選填）', placeholder: '例如：黑色' },
    {
      key: 'distinctiveFeatures',
      label: '明顯特徵（選填）',
      placeholder: '例如：胸口有白毛',
      multiline: true,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{title}</Text>
          {form.avatarUri ? (
            <Image source={{ uri: form.avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarEmoji}>🐶</Text>
            </View>
          )}

          {fields.map((field) => (
            <View key={field.key}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={[styles.input, field.multiline && styles.multiline]}
                value={String(form[field.key] ?? '')}
                onChangeText={(value) => update(field.key, value as never)}
                placeholder={field.placeholder}
                placeholderTextColor={Colors.subtext}
                multiline={field.multiline}
              />
            </View>
          ))}

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

          <TouchableOpacity style={styles.submitButton} onPress={submit}>
            <Text style={styles.submitText}>{submitLabel}</Text>
          </TouchableOpacity>
          {onCancel && (
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 28, paddingBottom: 60 },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 18,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 24,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  avatarEmoji: { fontSize: 48 },
  label: { color: Colors.text, fontWeight: '600', marginBottom: 7 },
  hint: { color: Colors.subtext, fontSize: 12 },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 15,
    marginBottom: 17,
    color: Colors.text,
  },
  multiline: { minHeight: 90, paddingTop: 14, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    minHeight: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  cancelButton: { alignItems: 'center', padding: 18 },
  cancelText: { color: Colors.subtext, fontWeight: '600' },
});
