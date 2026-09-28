import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../../constants/Colors';
import { SoftButton } from '../../../components/SoftMotion';
import type { HealthTrendResult } from '../../../utils/healthTrendEngine';
import { getHealthObservationText } from '../../../utils/healthTrendEngine';

type Props = {
  compact: boolean;
  loading: boolean;
  error: string;
  reminders: number | null;
  observations: HealthTrendResult | null;
  onRetry: () => void;
  onOpenReminders: () => void;
  onOpenObservations: () => void;
};

export function HomeTodayOverview({
  compact,
  loading,
  error,
  reminders,
  observations,
  onRetry,
  onOpenReminders,
  onOpenObservations,
}: Props) {
  return (
    <View style={[styles.todayOverlay, compact && styles.todayOverlayCompact]}>
      <View style={styles.titleRow}>
        <Text style={[styles.overlayTitle, styles.flex]}>今天待做</Text>
        {loading && <ActivityIndicator size="small" color={Colors.primary} />}
      </View>
      {error ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="重新載入照護資料"
          onPress={onRetry}
          style={styles.errorAction}
        >
          <Text style={styles.overlayHint}>{error}，點此重試</Text>
        </TouchableOpacity>
      ) : null}
      <SoftButton
        accessibilityRole="button"
        accessibilityLabel="查看今日待辦"
        style={[styles.summaryAction, compact && styles.summaryActionCompact]}
        onPress={onOpenReminders}
      >
        <View style={[styles.rowIcon, compact && styles.rowIconCompact, styles.reminderIcon]}>
          <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
        </View>
        <Text style={styles.todayStatusText}>今日待辦</Text>
        <Text style={styles.link}>
          {reminders === null ? '查看' : reminders ? `${reminders} 項` : '無待辦'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.subtext} />
      </SoftButton>
      <SoftButton
        accessibilityRole="button"
        accessibilityLabel="查看健康觀察紀錄"
        style={[
          styles.summaryAction,
          compact && styles.summaryActionCompact,
          styles.observationAction,
        ]}
        onPress={onOpenObservations}
      >
        <View style={[styles.rowIcon, compact && styles.rowIconCompact, styles.observationIcon]}>
          <Ionicons name="heart-outline" size={18} color={Colors.success} />
        </View>
        <Text style={styles.todayStatusText}>健康觀察</Text>
        <Text style={styles.summaryValue} numberOfLines={1} ellipsizeMode="tail">
          {observations ? getHealthObservationText(observations) : '查看紀錄'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.subtext} />
      </SoftButton>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayOverlay: {
    backgroundColor: 'rgba(255,250,242,0.91)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 9,
    marginBottom: 7,
  },
  todayOverlayCompact: { paddingVertical: 8, marginTop: 7, marginBottom: 7 },
  overlayTitle: { color: Colors.text, fontSize: 19, lineHeight: 25, fontWeight: '800' },
  summaryAction: {
    minHeight: 54,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  summaryActionCompact: { minHeight: 50, paddingVertical: 5 },
  observationAction: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(116,107,99,0.18)',
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconCompact: { width: 34, height: 34, borderRadius: 13 },
  reminderIcon: { backgroundColor: Colors.primarySoft },
  observationIcon: { backgroundColor: Colors.successSoft },
  todayStatusText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
  },
  overlayHint: { color: Colors.subtext, fontSize: 12, marginTop: 4 },
  summaryValue: {
    color: Colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
    textAlign: 'right',
  },
  errorAction: { minHeight: 44, justifyContent: 'center' },
  link: { color: Colors.primary, fontWeight: '800', fontSize: 15 },
});
