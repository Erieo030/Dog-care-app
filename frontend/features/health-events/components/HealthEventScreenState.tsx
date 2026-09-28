import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '../../../constants/Colors';

export function HealthEventLoadingState({ text }: { text?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.primary} />
      {text ? <Text style={styles.stateText}>{text}</Text> : null}
    </View>
  );
}

export function HealthEventErrorState({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.error}>{text}</Text>
      <TouchableOpacity style={styles.retry} onPress={onRetry}>
        <Text style={styles.retryText}>重新載入</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  stateText: { color: Colors.subtext, marginTop: 10 },
  error: { color: '#C55B5B', textAlign: 'center' },
  retry: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryText: { color: Colors.text, fontWeight: '700' },
});
