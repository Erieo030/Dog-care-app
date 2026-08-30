import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

type Props = {
  text: string;
  loading?: boolean;
  error?: boolean;
  action?: () => void;
};

export default function ScreenState({ text, loading = false, error = false, action }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}><Ionicons name={error ? 'leaf-outline' : 'paw-outline'} size={25} color={error ? Colors.success : Colors.primary} /></View>
      {loading ? <ActivityIndicator color={Colors.primary} /> : null}
      <Text style={[styles.text, error && styles.error]}>{text}</Text>
      {action ? (
        <TouchableOpacity style={styles.retry} onPress={action} accessibilityRole="button">
          <Text style={styles.retryText}>重新載入</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: Colors.background,
  },
  icon: { width: 48, height: 48, borderRadius: 17, marginBottom: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft },
  text: { color: Colors.subtext, textAlign: 'center', marginTop: 10 },
  error: { color: Colors.danger },
  retry: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 11,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: { color: Colors.text, fontWeight: '700' },
});
