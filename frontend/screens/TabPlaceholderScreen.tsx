/** 用途：MainTabs 尚未進入後續 Phase 的分頁空狀態。 */
import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Colors } from '../constants/Colors';

interface Props {
  title: string;
  message: string;
}

export default function TabPlaceholderScreen({ title, message }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  title: { color: Colors.text, fontSize: 26, fontWeight: '800' },
  message: {
    color: Colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10,
  },
});
