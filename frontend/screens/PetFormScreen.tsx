/** 毛孩新增與編輯共用表單，集中處理欄位驗證與健康資料輸入。 */
import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
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
import { Ionicons } from '@expo/vector-icons';
import DatePickerField from '../components/DatePickerField';
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
    onSubmit({
      ...form,
      name: form.name.trim(),
      gender: form.gender,
      breed: form.breed.trim(),
    });
  };

  const fields: Array<{
    key: keyof PetData;
    label: string;
    placeholder: string;
    multiline?: boolean;
  }> = [
    { key: 'name', label: '毛孩姓名（必填）', placeholder: '例如：Kuro' },
    { key: 'breed', label: '品種（必填）', placeholder: '例如：柴犬、米克斯' },
    { key: 'birthday', label: '出生日期', placeholder: '不知道可留空：YYYY-MM-DD' },
    { key: 'arrivalDate', label: '到家日期（必填）', placeholder: 'YYYY-MM-DD' },
    { key: 'allergies', label: '過敏資訊', placeholder: '沒有可留空', multiline: true },
    {
      key: 'chronicDiseases',
      label: '慢性病',
      placeholder: '沒有可留空',
      multiline: true,
    },
    { key: 'microchipNumber', label: '晶片號碼', placeholder: '可留空' },
    { key: 'coatColor', label: '毛色', placeholder: '例如：黑色' },
    {
      key: 'distinctiveFeatures',
      label: '明顯特徵',
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
              <Ionicons name="paw" size={42} color={Colors.primary} />
            </View>
          )}

          <Text style={styles.label}>性別（必填）</Text>
          <View style={styles.optionRow}>
            {([['male', '公'], ['female', '母']] as const).map(([value, label]) => (
              <TouchableOpacity key={value} style={[styles.option, form.gender === value && styles.optionSelected]} onPress={() => update('gender', value)}>
                <Text style={[styles.optionText, form.gender === value && styles.optionTextSelected]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>品種類型（必填）</Text>
          <View style={styles.optionRow}>
            {([['purebred', '純種'], ['mixed', '混種'], ['unknown', '不確定']] as const).map(([value, label]) => (
              <TouchableOpacity key={value} style={[styles.option, form.breedType === value && styles.optionSelected]} onPress={() => update('breedType', value)}>
                <Text style={[styles.optionText, form.breedType === value && styles.optionTextSelected]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>頭像</Text>
          <View style={styles.imageActions}>
            <TouchableOpacity style={styles.imageButton} onPress={async () => { const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 }); if (!r.canceled) update('avatarUri', r.assets[0].uri); }}><Text style={styles.imageButtonText}>從相簿選擇</Text></TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={async () => { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) { Alert.alert('需要相機權限', '請允許相機權限後再拍照'); return; } const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 }); if (!r.canceled) update('avatarUri', r.assets[0].uri); }}><Text style={styles.imageButtonText}>拍照</Text></TouchableOpacity>
            {form.avatarUri ? <TouchableOpacity style={styles.removeButton} onPress={() => update('avatarUri', '')}><Text style={styles.removeText}>移除圖片</Text></TouchableOpacity> : null}
          </View>
          {fields.map((field) => (
            <View key={field.key}>
              <Text style={styles.label}>{field.label}</Text>
              {field.key === 'birthday' || field.key === 'arrivalDate' ? (
                <DatePickerField
                  label=""
                  value={form[field.key] ? new Date(`${form[field.key]}T12:00:00`) : undefined}
                  placeholder={field.placeholder}
                  onChange={(date) => update(field.key, date.toISOString().slice(0, 10))}
                  maximumDate={new Date()}
                />
              ) : (
                <TextInput
                  style={[styles.input, field.multiline && styles.multiline]}
                  value={String(form[field.key] ?? '')}
                  onChangeText={(value) => update(field.key, value as never)}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.subtext}
                  multiline={field.multiline}
                />
              )}
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
  content: { paddingHorizontal: 28, paddingTop: 18, paddingBottom: 60 },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'left',
    marginBottom: 14,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: 'center',
    marginBottom: 18,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  avatarEmoji: { fontSize: 48 },
  label: { color: Colors.text, fontWeight: '700', marginBottom: 7, fontSize: 15 },
  optionRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  option: { flex: 1, minHeight: 50, borderWidth: 1, borderColor: '#E8DDD4', borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  optionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { color: Colors.text, fontWeight: '700' },
  optionTextSelected: { color: '#FFF' },
  imageActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  imageButton: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  imageButtonText: { color: Colors.primary, fontWeight: '700' },
  removeButton: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFF1F0', borderWidth: 1, borderColor: '#F3B5AE' },
  removeText: { color: '#C94C4C', fontWeight: '700' },
  hint: { color: Colors.subtext, fontSize: 12 },
  dateValue: { color: Colors.text },
  datePlaceholder: { color: Colors.subtext },
  input: {
    minHeight: 54,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8DDD4',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 16,
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
    minHeight: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  cancelButton: { alignItems: 'center', padding: 18 },
  cancelText: { color: Colors.subtext, fontWeight: '600' },
});
