import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

const today = () => { const date = new Date(); date.setHours(12, 0, 0, 0); return date; };


function CalendarModal({ open, value, minimumDate, maximumDate, onConfirm, onCancel }: { open: boolean; value: Date; minimumDate?: Date; maximumDate?: Date; onConfirm: (date: Date) => void; onCancel: () => void }) {
  const [month, setMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const [selected, setSelected] = useState(value);
  const [yearPicker, setYearPicker] = useState(false);
  const [yearStart, setYearStart] = useState(Math.floor(value.getFullYear() / 12) * 12);
  useEffect(() => { if (open) { setSelected(value); setMonth(new Date(value.getFullYear(), value.getMonth(), 1)); setYearPicker(false); setYearStart(Math.floor(value.getFullYear() / 12) * 12); } }, [open, value]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: first + days }, (_, i) => i < first ? null : i - first + 1);
  const selectable = (day: number) => { const date = new Date(month.getFullYear(), month.getMonth(), day, 12); return (!minimumDate || date >= minimumDate) && (!maximumDate || date <= maximumDate); };
  const years = Array.from({ length: 12 }, (_, index) => yearStart + index);
  return <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}><View style={styles.modalBackdrop}><View style={styles.calendarModal}><View style={styles.monthRow}><TouchableOpacity accessibilityRole="button" accessibilityLabel={yearPicker ? '上一組年份' : '上一個月'} onPress={() => yearPicker ? setYearStart((value) => value - 12) : setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Text style={styles.monthArrow}>‹</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="選擇年份" onPress={() => { setYearPicker((value) => !value); setYearStart(Math.floor(month.getFullYear() / 12) * 12); }}><Text style={styles.monthTitle}>{yearPicker ? `${yearStart}–${yearStart + 11}` : `${month.getFullYear()} 年 ${month.getMonth() + 1} 月`}</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel={yearPicker ? '下一組年份' : '下一個月'} onPress={() => yearPicker ? setYearStart((value) => value + 12) : setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Text style={styles.monthArrow}>›</Text></TouchableOpacity></View>{yearPicker ? <View style={styles.yearGrid}>{years.map((year) => <TouchableOpacity key={year} accessibilityRole="button" accessibilityLabel={`選擇年份 ${year}`} style={styles.yearCell} onPress={() => { setMonth(new Date(year, month.getMonth(), 1)); setYearPicker(false); }}><Text style={[styles.yearText, year === month.getFullYear() && styles.selectedYear]}>{year}</Text></TouchableOpacity>)}</View> : <><View style={styles.weekRow}>{['日','一','二','三','四','五','六'].map((x) => <Text key={x} style={styles.week}>{x}</Text>)}</View><View style={styles.dayGrid}>{cells.map((day, i) => day == null ? <View key={i} style={styles.dayCell} /> : <TouchableOpacity key={i} disabled={!selectable(day)} style={styles.dayCell} onPress={() => setSelected(new Date(month.getFullYear(), month.getMonth(), day, 12))}><Text style={[styles.dayText, selected.getFullYear() === month.getFullYear() && selected.getMonth() === month.getMonth() && selected.getDate() === day && styles.selectedDay, !selectable(day) && styles.disabledDay]}>{day}</Text></TouchableOpacity>)}</View></>}<View style={styles.actions}><TouchableOpacity accessibilityRole="button" accessibilityLabel="確認日期" style={styles.done} onPress={() => { onConfirm(selected); }}><Text style={styles.doneText}>完成</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="取消選擇" style={styles.cancel} onPress={onCancel}><Text style={styles.cancelText}>取消</Text></TouchableOpacity></View></View></View></Modal>;
}

function TimeModal({ open, value, onConfirm, onCancel }: { open: boolean; value: Date; onConfirm: (date: Date) => void; onCancel: () => void }) {
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(value.getMinutes());
  useEffect(() => { if (open) { setHour(value.getHours()); setMinute(value.getMinutes()); } }, [open, value]);
  const adjust = (kind: 'hour' | 'minute', amount: number) => {
    if (kind === 'hour') setHour((v) => (v + amount + 24) % 24);
    else setMinute((v) => (v + amount + 60) % 60);
  };
  return <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}><View style={styles.modalBackdrop}><View style={styles.calendarModal}><Text style={styles.timeTitle}>選擇時間</Text><View style={styles.timePickerRow}>{(['hour', 'minute'] as const).map((kind) => <View key={kind} style={styles.timeColumn}><TouchableOpacity accessibilityRole="button" accessibilityLabel={`增加${kind === 'hour' ? '小時' : '分鐘'}`} onPress={() => adjust(kind, 1)}><Text style={styles.timeArrow}>＋</Text></TouchableOpacity><Text style={styles.timeValue}>{String(kind === 'hour' ? hour : minute).padStart(2, '0')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={`減少${kind === 'hour' ? '小時' : '分鐘'}`} onPress={() => adjust(kind, -1)}><Text style={styles.timeArrow}>−</Text></TouchableOpacity><Text style={styles.timeUnit}>{kind === 'hour' ? '小時' : '分鐘'}</Text></View>)}</View><View style={styles.actions}><TouchableOpacity style={styles.done} onPress={() => { const next = new Date(value); next.setHours(hour, minute, 0, 0); onConfirm(next); }}><Text style={styles.doneText}>完成</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="取消選擇" style={styles.cancel} onPress={onCancel}><Text style={styles.cancelText}>取消</Text></TouchableOpacity></View></View></View></Modal>;
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
  const validValue = value && !Number.isNaN(value.getTime()) && value.getFullYear() >= 2000 ? value : undefined;
  const [draft, setDraft] = useState(validValue ?? today());
  useEffect(() => {
    if (validValue && !open) setDraft(validValue);
  }, [validValue, open]);
  const shown = validValue
    ? mode === 'date'
      ? validValue.toLocaleDateString('zh-TW')
      : mode === 'time'
        ? validValue.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
        : validValue.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : placeholder;
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${label}${value ? `，目前為 ${shown}` : ''}`}
        accessibilityHint={disabled ? '目前無法修改' : `開啟${mode === 'time' ? '時間' : '日期'}選擇器`}
        disabled={disabled}
        style={styles.field}
        onPress={() => {
          setDraft(validValue ?? today());
          setPhase(mode === 'datetime' ? 'date' : mode);
          // 讓 draft 先完成更新，再開啟原生 spinner，避免沿用 1970 epoch。
          setTimeout(() => setOpen(true), 0);
        }}
      >
        <Ionicons name={mode === 'time' ? 'time-outline' : 'calendar-outline'} size={19} color="#B7653B" style={styles.calendarIcon} /><Text style={value ? styles.value : styles.placeholder}>{shown}</Text>
      </TouchableOpacity>
      {mode === 'time' || (mode === 'datetime' && phase === 'time') ? <TimeModal open={open} value={draft} onConfirm={(date) => { setDraft(date); onChange(date); setOpen(false); }} onCancel={() => setOpen(false)} /> : <CalendarModal open={open} value={draft} minimumDate={minimumDate} maximumDate={maximumDate} onConfirm={(date) => { setDraft(date); if (mode === 'datetime') { setPhase('time'); } else { onChange(date); setOpen(false); } }} onCancel={() => setOpen(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 17 },
  label: { color: '#5F5148', fontWeight: '700', marginBottom: 7 },
  field: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DED4C7', borderRadius: 12, backgroundColor: '#FFF', justifyContent: 'center', paddingHorizontal: 15 },
  calendarIcon: { marginRight: 9 },
  value: { color: '#40362F' },
  placeholder: { color: '#9B8D7F' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,0.25)' },
  calendarModal: { backgroundColor: '#FFF', borderRadius: 20, padding: 16 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  timeTitle: { fontSize: 20, fontWeight: '800', color: '#40362F', textAlign: 'center', marginBottom: 18 },
  timePickerRow: { flexDirection: 'row', justifyContent: 'center', gap: 34 },
  timeColumn: { alignItems: 'center', minWidth: 80 },
  timeArrow: { fontSize: 28, color: '#B7653B', paddingVertical: 4 },
  timeValue: { fontSize: 38, fontWeight: '800', color: '#40362F' },
  timeUnit: { color: '#8A817B', marginTop: 4 },
  monthTitle: { fontSize: 17, fontWeight: '800', color: '#40362F' },
  monthArrow: { fontSize: 30, color: '#B7653B', paddingHorizontal: 10 },
  weekRow: { flexDirection: 'row' },
  week: { flex: 1, textAlign: 'center', color: '#8A817B', fontWeight: '700', marginBottom: 8 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  yearCell: { width: '25%', height: 48, alignItems: 'center', justifyContent: 'center' },
  yearText: { fontSize: 17, color: '#40362F', paddingHorizontal: 10, paddingVertical: 7 },
  selectedYear: { backgroundColor: '#B7653B', color: '#FFF', borderRadius: 16, overflow: 'hidden' },
  dayCell: { width: '14.285%', height: 42, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 16, color: '#40362F' },
  selectedDay: { backgroundColor: '#B7653B', color: '#FFF', borderRadius: 18, paddingHorizontal: 9, paddingVertical: 5, overflow: 'hidden' },
  disabledDay: { color: '#D5CEC6' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'stretch' },
  done: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#8B684D' },
  doneText: { color: '#FFF', fontWeight: '800' },
  cancel: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#F1ECE5' },
  cancelText: { color: '#8B684D', fontWeight: '700' },
});
