/** 用途：以 SVG 圓餅圖顯示近 30 天健康事件分類。 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../../constants/Colors';
import { DashboardHealthCategories } from '../../types';
const rows = [
  ['digestive', '消化', '#F0A35E'],
  ['skin', '皮膚', '#D97878'],
  ['eye_ear', '眼耳', '#6FA8A1'],
  ['injury', '受傷／誤食', '#7D91C6'],
  ['other', '其他', '#B69AC7'],
] as const;
export default function HealthEventPieChart({ data }: { data: DashboardHealthCategories }) {
  const total = rows.reduce((sum, [key]) => sum + data[key], 0);
  if (!total) return <Text style={s.empty}>最近 30 天沒有健康異常紀錄</Text>;
  const radius = 42,
    circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <View style={s.row}>
      <View>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <Circle cx="60" cy="60" r={radius} stroke={Colors.border} strokeWidth="22" fill="none" />
          {rows.map(([key, , color]) => {
            const value = data[key];
            const length = (value / total) * circumference;
            const node = (
              <Circle
                key={key}
                cx="60"
                cy="60"
                r={radius}
                stroke={color}
                strokeWidth="22"
                fill="none"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                rotation="-90"
                origin="60, 60"
              />
            );
            offset += length;
            return node;
          })}
        </Svg>
        <View style={s.center}>
          <Text style={s.total}>{total}</Text>
          <Text style={s.caption}>筆</Text>
        </View>
      </View>
      <View style={s.legend}>
        {rows.map(([key, label, color]) => (
          <View key={key} style={s.legendRow}>
            <View style={[s.dot, { backgroundColor: color }]} />
            <Text style={s.label}>{label}</Text>
            <Text style={s.value}>{data[key]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  center: { position: 'absolute', left: 0, right: 0, top: 40, alignItems: 'center' },
  total: { fontSize: 20, fontWeight: '800', color: Colors.text },
  caption: { fontSize: 10, color: Colors.subtext },
  legend: { minWidth: 130 },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 7 },
  label: { flex: 1, color: Colors.subtext, fontSize: 12 },
  value: { color: Colors.text, fontWeight: '700' },
  empty: { color: Colors.subtext, textAlign: 'center', paddingVertical: 28 },
});
