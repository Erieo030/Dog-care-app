/** 用途：用藥詳細頁的單一資料列。 */
import React from 'react';
import { Text, View } from 'react-native';
import { medicationStyles as styles } from '../medicationStyles';

type Props = {
  label: string;
  value: string;
  multiline?: boolean;
};

export function MedicationDetailRow({ label, value, multiline = false }: Props) {
  return (
    <View style={[styles.detailRow, multiline && styles.detailRowMultiline]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, multiline && styles.detailValueMultiline]}>{value}</Text>
    </View>
  );
}
