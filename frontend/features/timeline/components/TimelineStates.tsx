import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';

export function TimelineSwitchingState() {
  return (
    <View style={styles.inline}>
      <ActivityIndicator color={Colors.primary} />
      <Text style={styles.stateText}>切換篩選中…</Text>
    </View>
  );
}

export function TimelineErrorState({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.stateText}>{text}</Text>
      <TouchableOpacity style={styles.retry} onPress={onRetry}>
        <Text style={styles.retryText}>重新載入</Text>
      </TouchableOpacity>
    </View>
  );
}

export function TimelineEmptyState() {
  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIcon}>
        <Ionicons name="paw-outline" size={28} color={Colors.primary} />
      </View>
      <Text style={styles.empty}>這一天還沒有紀錄</Text>
      <Text style={styles.emptyHint}>有記下的日常、提醒或健康照護，都會顯示在這裡。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 30,
  },
  inline: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 15,
  },
  stateText: { color: Colors.subtext, textAlign: 'center', marginTop: 8 },
  emptyBox: { alignItems: 'center', paddingVertical: 38 },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyHint: { color: Colors.subtext, fontSize: 13, marginTop: 8, textAlign: 'center' },
  empty: { color: Colors.text, fontWeight: '700', textAlign: 'center' },
  retry: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: Colors.text, fontWeight: '700' },
});
