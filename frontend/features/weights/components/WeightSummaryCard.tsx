import React from 'react';
import { Text, View } from 'react-native';

import type { WeightSummary } from '../../../types';
import { formatWeightDate, getWeightDifferenceText } from '../weightListContent';
import { weightListStyles as styles } from '../weightListStyles';

export function WeightSummaryCard({ summary }: { summary: WeightSummary }) {
  const differenceText = getWeightDifferenceText(summary);
  return (
    <View style={styles.summary}>
      <Text style={styles.caption}>最新體重</Text>
      <Text style={styles.current}>
        {summary.latestWeightKg == null ? '尚未記錄體重' : `${summary.latestWeightKg} kg`}
      </Text>
      {summary.latestMeasuredAt && (
        <Text style={styles.measuredAt}>
          最近測量日期：{formatWeightDate(summary.latestMeasuredAt)}
        </Text>
      )}
      {differenceText && (
        <Text
          style={[
            styles.diff,
            summary.change === 'increased' && styles.increased,
            summary.change === 'decreased' && styles.decreased,
          ]}
        >
          {differenceText}
        </Text>
      )}
    </View>
  );
}
