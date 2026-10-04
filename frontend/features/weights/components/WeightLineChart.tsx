import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';

import type { WeightRecord } from '../../../types';
import { formatWeightDate } from '../weightListContent';
import { weightListStyles as styles } from '../weightListStyles';

export function WeightLineChart({ items }: { items: WeightRecord[] }) {
  const [width, setWidth] = useState(0);
  const chronological = useMemo(
    () =>
      [...items].sort(
        (left, right) => new Date(left.measuredAt).getTime() - new Date(right.measuredAt).getTime(),
      ),
    [items],
  );

  if (!chronological.length) return <Text style={styles.empty}>此期間沒有資料可繪製趨勢</Text>;
  if (chronological.length === 1)
    return <Text style={styles.empty}>至少需要兩筆資料才能顯示趨勢</Text>;

  const weights = chronological.map((item) => item.weightKg);
  const rawMin = Math.min(...weights);
  const rawMax = Math.max(...weights);
  const padding = rawMax === rawMin ? Math.max(rawMax * 0.05, 0.5) : (rawMax - rawMin) * 0.15;
  const min = Math.max(0, rawMin - padding);
  const max = rawMax + padding;
  const plotLeft = 45;
  const plotTop = 8;
  const plotHeight = 145;
  // Measure the inner canvas (not the padded card) and reserve half a point
  // radius at both ends so the first and last markers stay fully visible.
  const plotWidth = Math.max(width - plotLeft - 8 - 4, 1);
  const points = chronological.map((item, index) => ({
    x: plotLeft + (index / (chronological.length - 1)) * plotWidth,
    y: plotTop + ((max - item.weightKg) / (max - min || 1)) * plotHeight,
    item,
  }));
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartCanvas} onLayout={onLayout}>
        <Text style={[styles.axisLabel, { top: 0 }]}>{max.toFixed(1)} kg</Text>
        <Text style={[styles.axisLabel, { top: plotHeight - 4 }]}>{min.toFixed(1)} kg</Text>
        <View style={[styles.axisLine, { left: plotLeft, top: plotTop, height: plotHeight }]} />
        <View
          style={[
            styles.horizontalAxis,
            { left: plotLeft, top: plotTop + plotHeight, width: plotWidth },
          ]}
        />
        {width > 0 &&
          points.slice(0, -1).map((point, index) => {
            const next = points[index + 1];
            const deltaX = next.x - point.x;
            const deltaY = next.y - point.y;
            const length = Math.sqrt(deltaX ** 2 + deltaY ** 2);
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
            return (
              <View
                key={`${point.item.id}-${next.item.id}`}
                style={[
                  styles.chartLine,
                  {
                    width: length,
                    left: (point.x + next.x - length) / 2,
                    top: (point.y + next.y) / 2,
                    transform: [{ rotate: `${angle}deg` }],
                  },
                ]}
              />
            );
          })}
        {width > 0 &&
          points.map((point) => (
            <View
              key={point.item.id}
              style={[styles.chartPoint, { left: point.x - 4, top: point.y - 4 }]}
            />
          ))}
      </View>
      <View style={styles.xLabels}>
        <Text style={styles.xLabel}>{formatWeightDate(chronological[0].measuredAt)}</Text>
        <Text style={[styles.xLabel, styles.xLabelRight]}>
          {formatWeightDate(chronological[chronological.length - 1].measuredAt)}
        </Text>
      </View>
    </View>
  );
}
