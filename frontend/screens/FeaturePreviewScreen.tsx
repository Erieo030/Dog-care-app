/** 用途：Phase 2 快速入口的導航目標，清楚標示後續階段才實作的功能。 */
import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '../constants/Colors';
import { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'FeaturePreview'>;

export default function FeaturePreviewScreen({ route }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>🐾</Text>
        <Text style={styles.title}>{route.params.title}</Text>
        <Text style={styles.description}>{route.params.description}</Text>
        <Text style={styles.phase}>功能將依 adjust.txt 後續 Phase 開發</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
  },
  icon: { fontSize: 50, marginBottom: 14 },
  title: { color: Colors.text, fontSize: 25, fontWeight: '800' },
  description: {
    color: Colors.subtext,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 10,
  },
  phase: { color: Colors.primary, fontWeight: '700', marginTop: 22 },
});
