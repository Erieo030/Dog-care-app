/** 用途：以大型快速選項讓使用者在數秒內選擇異常類型。 */
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '../constants/Colors';
import { HomeStackParamList } from '../navigation/types';
import { HealthEventType, ObservationHealthEventType } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'AbnormalType'>;
const TYPES: Array<[HealthEventType, string, string]> = [
  ['vomiting', '嘔吐', '🤢'],
  ['abnormal_stool', '排便異常', '💩'],
  ['low_appetite', '食慾下降', '🍽️'],
  ['abnormal_drinking', '喝水異常', '💧'],
  ['low_energy', '精神下降', '😴'],
  ['injury', '受傷', '🩹'],
  ['skin_issue', '皮膚異常', '🔍'],
  ['eye_ear_issue', '眼睛／耳朵異常', '👀'],
  ['possible_ingestion', '疑似誤食', '⚠️'],
  ['other', '其他', '📝'],
];

export default function AbnormalRecordTypeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>發生什麼狀況？</Text>
        <Text style={styles.subtitle}>只記錄需要注意的異常，不必每天填寫。</Text>
        {TYPES.map(([type, label, icon]) => (
          <TouchableOpacity
            key={type}
            style={styles.item}
            onPress={() =>
              type === 'vomiting'
                ? navigation.navigate('VomitingHealthEvent', {})
                : type === 'abnormal_stool'
                  ? navigation.navigate('StoolHealthEvent', {})
                  : ['low_appetite', 'low_energy', 'abnormal_drinking'].includes(type)
                    ? navigation.navigate('ObservationHealthEvent', {
                        type: type as ObservationHealthEventType,
                      })
                    : navigation.navigate('CreateHealthEvent', { type, label })
            }
          >
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 50 },
  title: { color: Colors.text, fontSize: 27, fontWeight: '800' },
  subtitle: { color: Colors.subtext, lineHeight: 21, marginTop: 7, marginBottom: 20 },
  item: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 17,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  icon: { fontSize: 25, width: 42 },
  label: { flex: 1, color: Colors.text, fontWeight: '700', fontSize: 16 },
  arrow: { color: Colors.subtext, fontSize: 28 },
});
