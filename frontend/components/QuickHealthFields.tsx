/** 用途：提供健康快速表單共用的大型單選、複選與安全提示元件。 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { Option } from '../constants/ObservationHealthEvents';

export function QuickOptionGroup({ options, value, onChange }: { options: Option[]; value?: string; onChange: (value: string) => void }) {
  return <View style={styles.chips}>{options.map(([key, label]) => <TouchableOpacity key={key}
    style={[styles.chip, value === key && styles.active]} onPress={() => onChange(key)}>
    <Text style={[styles.text, value === key && styles.activeText]}>{label}</Text>
  </TouchableOpacity>)}</View>;
}
export function MultiSelectOptionGroup({ options, values, onChange }: { options: Option[]; values: string[]; onChange: (values: string[]) => void }) {
  return <View style={styles.chips}>{options.map(([key, label]) => { const active = values.includes(key); return <TouchableOpacity key={key}
    style={[styles.chip, active && styles.active]} onPress={() => onChange(active ? values.filter((value) => value !== key) : [...values, key])}>
    <Text style={[styles.text, active && styles.activeText]}>{label}</Text>
  </TouchableOpacity>; })}</View>;
}
export function HealthSafetyNotice({ message }: { message: string }) {
  return <View style={styles.safety}><Text style={styles.safetyTitle}>安全提醒</Text><Text style={styles.safetyText}>{message}</Text></View>;
}
const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: { minHeight: 48, justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 17, paddingHorizontal: 16, paddingVertical: 11 },
  active: { backgroundColor: Colors.text, borderColor: Colors.text }, text: { color: Colors.text }, activeText: { color: '#FFF', fontWeight: '700' },
  safety: { backgroundColor: '#FFF3E4', borderWidth: 1, borderColor: '#F0C58A', borderRadius: 16, padding: 15, marginTop: 20 },
  safetyTitle: { color: '#8A5420', fontWeight: '800' }, safetyText: { color: '#70451D', lineHeight: 21, marginTop: 5 },
});
