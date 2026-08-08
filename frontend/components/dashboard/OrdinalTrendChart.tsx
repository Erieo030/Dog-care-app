import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { Colors } from '../../constants/Colors';
type TrendPoint = { id: string; loggedAt: string; [key: string]: string | number | undefined };
export default function OrdinalTrendChart({
  items,
  field,
  labels,
  empty = '此期間尚無資料',
}: {
  items: TrendPoint[];
  field: string;
  labels: Record<string, string>;
  empty?: string;
}) {
  const points = useMemo(
    () =>
      items
        .filter((x) => x[field] != null)
        .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()),
    [items, field],
  );
  if (!points.length) return <Text style={s.empty}>{empty}</Text>;
  if (points.length === 1)
    return <Text style={s.empty}>目前只有 1 筆紀錄，持續記錄後即可查看趨勢。</Text>;
  const width = 310,
    height = 155,
    left = 38,
    right = 10,
    top = 12,
    bottom = 28;
  const labelKeys = Object.keys(labels);
  const vals = points.map((x) => Number.isFinite(Number(x[field])) ? Number(x[field]) : labelKeys.indexOf(String(x[field])) + 1);
  if (vals.some((value) => !Number.isFinite(value))) return <Text style={s.empty}>目前資料格式無法顯示趨勢</Text>;
  const min = Math.min(...vals) - 0.4;
  const max = Math.max(...vals) + 0.4;
  const coords = points.map((x, i) => ({
    x: left + (i / (points.length - 1)) * (width - left - right),
    y: top + ((max - (Number.isFinite(Number(x[field])) ? Number(x[field]) : labelKeys.indexOf(String(x[field])) + 1)) / (max - min || 1)) * (height - top - bottom),
  }));
  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={left} y1={top} x2={left} y2={height - bottom} stroke={Colors.border} />
        <Line
          x1={left}
          y1={height - bottom}
          x2={width - right}
          y2={height - bottom}
          stroke={Colors.border}
        />
        <Polyline
          points={coords.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={Colors.primary}
          strokeWidth="3"
        />
        {coords.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r="4" fill={Colors.primary} />
        ))}
        <SvgText x={2} y={top + 5} fontSize="9" fill={Colors.subtext}>
          {labels[String(Math.max(...vals))]}
        </SvgText>
        <SvgText x={2} y={height - bottom + 4} fontSize="9" fill={Colors.subtext}>
          {labels[String(Math.min(...vals))]}
        </SvgText>
      </Svg>
      <Text style={s.legend}>
        {Object.entries(labels)
          .map(([k, v]) => `${k} ${v}`)
          .join('　')}
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  empty: { color: Colors.subtext, textAlign: 'center', paddingVertical: 28 },
  legend: { color: Colors.subtext, fontSize: 11, lineHeight: 18 },
});
