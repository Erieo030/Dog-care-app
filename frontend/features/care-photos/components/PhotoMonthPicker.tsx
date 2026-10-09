import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../../constants/Colors';

export default function PhotoMonthPicker({
  visible,
  month,
  onChange,
  onClose,
}: {
  visible: boolean;
  month: string;
  onChange: (month: string) => void;
  onClose: () => void;
}) {
  const [year, setYear] = useState(Number(month.slice(0, 4)));
  const [choosingYear, setChoosingYear] = useState(false);
  const [yearStart, setYearStart] = useState(2020);
  useEffect(() => {
    if (visible) {
      const value = Number(month.slice(0, 4));
      setYear(value);
      setYearStart(Math.floor(value / 12) * 12);
      setChoosingYear(false);
    }
  }, [visible, month]);
  const years = Array.from({ length: 12 }, (_, i) => yearStart + i).filter(
    (value) => value >= 2000 && value <= 9998,
  );
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable
          accessibilityLabel="關閉月份選擇"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <ScrollView style={s.panel} contentContainerStyle={s.panelContent} bounces={false}>
          <Text style={s.title}>選擇照片月份</Text>
          <View style={s.header}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={choosingYear ? '上一組年份' : '上一年'}
              style={s.arrow}
              disabled={choosingYear ? yearStart <= 1992 : year <= 2000}
              onPress={() => (choosingYear ? setYearStart((v) => v - 12) : setYear((v) => v - 1))}
            >
              <Text style={s.text}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="選擇年份"
              style={s.year}
              onPress={() => setChoosingYear((v) => !v)}
            >
              <Text style={s.text}>
                {choosingYear ? `${yearStart} - ${yearStart + 11}` : `${year} 年 ▾`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={choosingYear ? '下一組年份' : '下一年'}
              style={s.arrow}
              disabled={choosingYear ? yearStart + 12 > 9998 : year >= 9998}
              onPress={() => (choosingYear ? setYearStart((v) => v + 12) : setYear((v) => v + 1))}
            >
              <Text style={s.text}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={s.grid}>
            {(choosingYear ? years : Array.from({ length: 12 }, (_, i) => i + 1)).map((value) => (
              <TouchableOpacity
                accessibilityRole="button"
                key={value}
                style={s.cell}
                onPress={() => {
                  if (choosingYear) {
                    setYear(value);
                    setChoosingYear(false);
                  } else {
                    onChange(`${year}-${String(value).padStart(2, '0')}`);
                    onClose();
                  }
                }}
              >
                <Text style={s.text}>{choosingYear ? value : `${value} 月`}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity accessibilityRole="button" style={s.cancel} onPress={onClose}>
            <Text style={s.text}>取消</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(47,41,37,0.35)',
  },
  panel: { backgroundColor: Colors.background, borderRadius: 24, maxHeight: '90%', flexGrow: 0 },
  panelContent: { padding: 20, gap: 16 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text },
  header: { flexDirection: 'row', alignItems: 'center' },
  year: { flex: 1, alignItems: 'center', padding: 12 },
  arrow: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 15, color: Colors.text, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: '30%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
  },
  cancel: { alignItems: 'center', padding: 12 },
});
