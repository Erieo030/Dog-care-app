import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface Props {
  value?: Date;
  mode?: 'date' | 'datetime' | 'time';
  label: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  onChange: (date: Date) => void;
}

export default function DatePickerField({
  value,
  mode = 'date',
  label,
  placeholder = '選擇日期',
  minimumDate,
  maximumDate,
  disabled,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'date' | 'time'>('date');
  const [draft, setDraft] = useState(value ?? new Date());
  const validValue = value && !Number.isNaN(value.getTime()) && value.getFullYear() >= 2000 ? value : undefined;
  useEffect(() => {
    if (validValue && !open) setDraft(validValue);
  }, [validValue, open]);
  const shown = validValue ? (mode === 'date' ? validValue.toLocaleDateString('zh-TW') : validValue.toLocaleString('zh-TW')) : placeholder;
  const select = (_event: DateTimePickerEvent, date?: Date) => {
    if (!date || date.getFullYear() < 2000) return;
    setDraft(date);
    if (mode === 'datetime' && phase === 'date') return;
    onChange(date);
    if (Platform.OS !== 'ios') setOpen(false);
  };
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        disabled={disabled}
        style={styles.field}
        onPress={() => {
          setDraft(validValue ?? new Date());
          setPhase(mode === 'datetime' ? 'date' : mode);
          setOpen(true);
        }}
      >
        <Text style={value ? styles.value : styles.placeholder}>{shown}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.pickerBox}>
          <DateTimePicker
            display="spinner"
            themeVariant="light"
            value={!Number.isNaN(draft.getTime()) && draft.getFullYear() >= 2000 ? draft : new Date()}
            mode={mode === 'datetime' ? phase : mode}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={select}
          />
          <View style={styles.actions}>
            {mode === 'datetime' && phase === 'date' && (
              <TouchableOpacity style={styles.next} onPress={() => setPhase('time')}>
                <Text style={styles.nextText}>下一步</Text>
              </TouchableOpacity>
            )}
            {mode === 'datetime' && phase === 'time' && (
            <TouchableOpacity style={styles.done} onPress={() => { onChange(draft); setOpen(false); }}>
              <Text style={styles.doneText}>完成</Text>
            </TouchableOpacity>
          )}
          {Platform.OS === 'ios' && mode !== 'datetime' && (
              <TouchableOpacity style={styles.done} onPress={() => setOpen(false)}>
                <Text style={styles.doneText}>完成</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancel} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 17 },
  label: { color: '#5F5148', fontWeight: '700', marginBottom: 7 },
  field: { minHeight: 54, borderWidth: 1, borderColor: '#DED4C7', borderRadius: 12, backgroundColor: '#FFF', justifyContent: 'center', paddingHorizontal: 15 },
  value: { color: '#40362F' },
  placeholder: { color: '#9B8D7F' },
  pickerBox: { marginTop: 8, padding: 10, borderRadius: 14, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DED4C7', overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'stretch' },
  done: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#8B684D' },
  doneText: { color: '#FFF', fontWeight: '800' },
  next: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#E7DED2' },
  nextText: { color: '#6A4D3E', fontWeight: '700' },
  cancel: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#F1ECE5' },
  cancelText: { color: '#8B684D', fontWeight: '700' },
});
