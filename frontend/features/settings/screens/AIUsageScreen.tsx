/** 用途：設定中的 AI 使用狀況；由 ProfileStack 的 AIUsage route 開啟。 */
import React, { useCallback, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/Colors';
import ScreenState from '../../../components/ScreenState';
import { useAuth } from '../../../contexts/AuthContext';
import { AIUsage, getAIUsage } from '../../../services/aiService';
import { useTabContentBottomPadding } from '../../../components/navigation/useTabContentBottomPadding';

export function AIUsageScreen() {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestRef = useRef(0);
  const userId = session?.userId;
  const load = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current;
    setLoading(true);
    setError('');
    setUsage(null);
    if (!userId) {
      setError('請先登入以查看 AI 使用狀況');
      setLoading(false);
      return;
    }
    try {
      const result = await getAIUsage(userId, signal);
      if (isCurrent()) setUsage(result);
    } catch (caught) {
      if (isCurrent()) setError((caught as Error).message || '無法取得 AI 使用狀況');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [userId]);
  useFocusEffect(
    React.useCallback(() => {
      const controller = new AbortController();
      void load(controller.signal);
      return () => {
        controller.abort();
        requestRef.current++;
      };
    }, [load]),
  );
  if (loading) return <ScreenState loading text="正在載入 AI 使用狀況…" />;
  if (error || !usage)
    return <ScreenState error text={error || '無法取得 AI 使用狀況'} action={() => void load()} />;
  const used = usage?.used ?? 0;
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomContentPadding }]}>
        <View style={s.usageIntro}>
          <View style={s.usageIntroIcon}>
            <Ionicons name="sparkles-outline" size={24} color={Colors.primary} />
          </View>
          <View style={s.usageIntroCopy}>
            <Text style={s.usageEyebrow}>MEGO AI</Text>
            <Text style={s.usageHeading}>AI 整理使用狀況</Text>
            <Text style={s.usageIntroHint}>了解今天已使用的整理與問答次數。</Text>
          </View>
        </View>
        <View style={s.usageCard}>
          <Text style={s.usageTitle}>今天已使用</Text>
          <Text style={s.usageValue}>{used} 次</Text>
          <Text style={s.usageHint}>
            {usage?.unlimited
              ? '目前未設定每日次數上限，可依需要使用。'
              : `今天還可使用 ${usage?.remaining ?? 0} 次，每日額度會在午夜更新。`}
          </Text>
        </View>
        <View style={s.usageNotice}>
          <Ionicons name="heart-outline" size={20} color={Colors.success} />
          <Text style={s.usageNoticeText}>
            AI 用於整理已記錄的照護資料與一般問題參考，不取代獸醫判斷。
          </Text>
        </View>
        <Text style={s.section}>可以請 MEGO 幫忙</Text>
        <View style={s.usageExamples}>
          <Text style={s.usageExample}>今天有什麼提醒？</Text>
          <Text style={s.usageExample}>最近體重如何？</Text>
          <Text style={s.usageExample}>最近有哪些健康異常？</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 45 },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.subtext,
    marginTop: 20,
    marginBottom: 7,
    marginLeft: 5,
  },
  usageIntro: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 20 },
  usageIntroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  usageIntroCopy: { flex: 1 },
  usageEyebrow: { color: Colors.primary, fontSize: 13, fontWeight: '800', marginBottom: 2 },
  usageHeading: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  usageIntroHint: { color: Colors.subtext, fontSize: 13, lineHeight: 19, marginTop: 3 },
  usageCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  usageTitle: { color: Colors.subtext, fontSize: 13, fontWeight: '700' },
  usageValue: { color: Colors.text, fontSize: 28, fontWeight: '900', marginTop: 5 },
  usageHint: { color: Colors.subtext, fontSize: 13, lineHeight: 19, marginTop: 6 },
  usageNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: Colors.successSoft,
    borderRadius: 16,
    padding: 13,
  },
  usageNoticeText: { flex: 1, color: '#526D60', fontSize: 13, lineHeight: 19 },
  usageExamples: { gap: 8 },
  usageExample: {
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '700',
  },
});
