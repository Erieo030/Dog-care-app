/** 用途：AI 助手入口，集中整理 AI 查詢與健康紀錄入口。 */
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '../constants/Colors';
import { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'HealthOverview'>;

export default function HealthHubScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>AI 助手</Text>
        <Text style={styles.subtitle}>整理 PawLog 中已記錄的毛孩資料，不提供疾病診斷。</Text>
        <Entry icon="✨" title="PawLog AI 助手" description="詢問體重、用藥、疫苗、就醫與提醒" onPress={() => navigation.navigate('AIChat')} />
        <Entry icon="🩺" title="準備看醫生" description="整理近期資料，產生就醫前摘要" onPress={() => navigation.navigate('VetVisitBrief')} />
        <Text style={styles.sectionTitle}>健康紀錄</Text>
        <Entry
          icon="🩺"
          title="健康異常紀錄"
          description="查看異常狀況的完整歷史"
          onPress={() => navigation.navigate('HealthEventList')}
        />
        <Entry
          icon="⚖️"
          title="體重紀錄"
          description="查看趨勢與歷史紀錄"
          onPress={() => navigation.navigate('WeightList')}
        />
        <Entry
          icon="🏥"
          title="就醫紀錄"
          description="保存看診內容與健康文件"
          onPress={() => navigation.navigate('MedicalVisitList')}
        />
      </View>
    </SafeAreaView>
  );
}

function Entry({
  icon,
  title,
  description,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.text}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18 },
  title: { color: Colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: Colors.subtext, marginTop: 6, marginBottom: 22 },
  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: '800', marginTop: 10, marginBottom: 10 },
  card: {
    minHeight: 76,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 19,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: { flex: 1 },
  icon: { fontSize: 32, width: 52 },
  cardTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  text: { color: Colors.subtext, marginTop: 4 },
});
