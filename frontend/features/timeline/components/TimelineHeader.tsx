import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import {
  buildCalendarDays,
  getLocalDateKey,
  TIMELINE_CATEGORIES,
  TimelineCategory,
} from '../timelineContent';

type Props = {
  petName?: string;
  avatarUrl?: string;
  month: Date;
  selectedDate: Date;
  markedDays: Record<string, TimelineCategory[]>;
  itemCount: number;
  onSelectDate: (date: Date) => void;
  onSelectMonth: (date: Date) => void;
  onGoToday: () => void;
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = Array.from({ length: 12 }, (_, index) => `${index + 1} 月`);

export default function TimelineHeader({
  petName,
  avatarUrl,
  month,
  selectedDate,
  markedDays,
  itemCount,
  onSelectDate,
  onSelectMonth,
  onGoToday,
}: Props) {
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(month.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(month.getMonth());
  const days = useMemo(() => buildCalendarDays(month), [month]);
  const todayKey = getLocalDateKey(new Date());
  const selectedKey = getLocalDateKey(selectedDate);
  const selectedHeading = `${selectedDate.getMonth() + 1} 月 ${selectedDate.getDate()} 日，${selectedDate.toLocaleDateString('zh-TW', { weekday: 'long' })}`;
  const isToday = selectedKey === todayKey;

  useEffect(() => {
    if (monthPickerOpen) {
      setPickerYear(month.getFullYear());
      setPickerMonth(month.getMonth());
    }
  }, [month, monthPickerOpen]);

  const changeMonth = (amount: number) =>
    onSelectMonth(new Date(month.getFullYear(), month.getMonth() + amount, 1));

  return (
    <View>
      <View style={styles.petHeader}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.petAvatar} />
        ) : (
          <View style={styles.petAvatarFallback}>
            <Ionicons name="paw-outline" size={21} color={Colors.primary} />
          </View>
        )}
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>照護紀錄</Text>
          <Text style={styles.title}>{petName ? `${petName} 的生活足跡` : '生活足跡'}</Text>
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.monthBar}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="上一個月"
            style={styles.arrowButton}
            onPress={() => changeMonth(-1)}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="選擇年份與月份"
            style={styles.monthTitleButton}
            onPress={() => setMonthPickerOpen(true)}
          >
            <Text style={styles.monthTitle}>
              {month.getFullYear()} 年 {month.getMonth() + 1} 月
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.subtext} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="下一個月"
            style={styles.arrowButton}
            onPress={() => changeMonth(1)}
          >
            <Ionicons name="chevron-forward" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((weekday) => (
            <Text key={weekday} style={styles.weekday}>
              {weekday}
            </Text>
          ))}
        </View>
        <View style={styles.daysGrid}>
          {days.map((date) => {
            const key = getLocalDateKey(date);
            const categories = markedDays[key] || [];
            const selected = key === selectedKey;
            const currentMonth = date.getMonth() === month.getMonth();
            const marks = categories.slice(0, 4);
            return (
              <TouchableOpacity
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${date.getMonth() + 1} 月 ${date.getDate()} 日${categories.length ? `，${categories.length} 類紀錄` : ''}`}
                accessibilityState={{ selected }}
                style={styles.dayCell}
                onPress={() => onSelectDate(date)}
              >
                <View
                  style={[
                    styles.dayNumberWrap,
                    selected && styles.dayNumberSelected,
                    key === todayKey && !selected && styles.dayNumberToday,
                    !currentMonth && styles.dayOutsideMonth,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      !currentMonth && styles.dayNumberMuted,
                      selected && styles.dayNumberSelectedText,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </View>
                <View style={styles.markerRow}>
                  {marks.map((category) => (
                    <View
                      key={category}
                      style={[
                        styles.marker,
                        {
                          backgroundColor:
                            TIMELINE_CATEGORIES.find((item) => item.key === category)?.color ??
                            Colors.shadow,
                        },
                      ]}
                    />
                  ))}
                  {categories.length > marks.length ? (
                    <Text style={styles.moreMarker}>+</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.legend}>
          {TIMELINE_CATEGORIES.map((category) => (
            <View key={category.key} style={styles.legendItem}>
              <View style={[styles.legendMark, { backgroundColor: category.color }]} />
              <Text style={styles.legendText}>{category.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.selectedDayRow}>
        <View style={styles.flex}>
          <Text style={styles.selectedDate}>{selectedHeading}</Text>
          <Text style={styles.selectedCount}>
            {itemCount ? `${itemCount} 筆紀錄與提醒` : '查看這一天的照護紀錄'}
          </Text>
        </View>
        {!isToday ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.todayButton}
            onPress={onGoToday}
          >
            <Text style={styles.todayButtonText}>回到今天</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.todayTag}>
            <Text style={styles.todayTagText}>今天</Text>
          </View>
        )}
      </View>

      <Modal
        transparent
        visible={monthPickerOpen}
        animationType="fade"
        onRequestClose={() => setMonthPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMonthPickerOpen(false)}>
          <Pressable style={styles.monthPicker} onPress={() => undefined}>
            <Text style={styles.modalTitle}>選擇年份與月份</Text>
            <View style={styles.yearRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="前一年"
                style={styles.yearArrow}
                onPress={() => setPickerYear((year) => year - 1)}
              >
                <Ionicons name="chevron-back" size={20} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.yearText}>{pickerYear} 年</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="後一年"
                style={styles.yearArrow}
                onPress={() => setPickerYear((year) => year + 1)}
              >
                <Ionicons name="chevron-forward" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.monthGrid}>
              {MONTHS.map((label, index) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.monthOption, pickerMonth === index && styles.monthOptionActive]}
                  onPress={() => {
                    setPickerMonth(index);
                    setMonthPickerOpen(false);
                    onSelectMonth(new Date(pickerYear, index, 1));
                  }}
                >
                  <Text
                    style={[
                      styles.monthOptionText,
                      pickerMonth === index && styles.monthOptionTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setMonthPickerOpen(false)}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  petHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  petAvatar: { width: 48, height: 48, borderRadius: 16, marginRight: 12 },
  petAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  eyebrow: { color: Colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: Colors.text, fontSize: 22, fontWeight: '800', marginTop: 2 },
  calendarCard: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  monthBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  monthTitleButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
  },
  monthTitle: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  weekRow: { flexDirection: 'row', marginTop: 6, marginBottom: 2 },
  weekday: {
    width: `${100 / 7}%`,
    color: Colors.subtext,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  dayNumberWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberSelected: { backgroundColor: Colors.primary },
  dayNumberToday: { borderWidth: 1.5, borderColor: Colors.primary },
  dayOutsideMonth: { opacity: 0.48 },
  dayNumber: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  dayNumberMuted: { color: Colors.subtext },
  dayNumberSelectedText: { color: '#FFF', fontWeight: '800' },
  markerRow: {
    height: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 1,
  },
  marker: { width: 4, height: 4, borderRadius: 2 },
  moreMarker: { color: Colors.subtext, fontSize: 8, lineHeight: 8 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 13,
    rowGap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 7,
    paddingTop: 11,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendMark: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { color: Colors.subtext, fontSize: 11 },
  selectedDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 11,
    paddingHorizontal: 2,
  },
  selectedDate: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  selectedCount: { color: Colors.subtext, fontSize: 12, marginTop: 3 },
  todayButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
  },
  todayButtonText: { color: Colors.primary, fontWeight: '800', fontSize: 13 },
  todayTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.successSoft,
  },
  todayTagText: { color: Colors.success, fontSize: 12, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(47,41,37,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  monthPicker: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
    marginBottom: 14,
  },
  yearArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Colors.surfaceSoft,
  },
  yearText: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  monthOption: {
    width: '31%',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Colors.surfaceSoft,
  },
  monthOptionActive: { backgroundColor: Colors.primary },
  monthOptionText: { color: Colors.text, fontWeight: '700' },
  monthOptionTextActive: { color: '#FFF' },
  cancelButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  cancelText: { color: Colors.subtext, fontWeight: '700' },
});
