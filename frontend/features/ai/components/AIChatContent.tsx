import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../../constants/Colors';
import type { ChatResponse } from '../../../services/aiService';

export type AIChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  result?: ChatResponse;
  sources?: ChatResponse['sources'];
};

const QUICK_PROMPTS = [
  '最近體重如何？',
  '今天有什麼提醒？',
  '上次疫苗是什麼時候？',
  '現在正在吃什麼藥？',
];

export function AIChatMessageBubble({ item }: { item: AIChatMessage }) {
  const isUser = item.role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      <View style={styles.bubbleHeader}>
        <Ionicons
          name={isUser ? 'person-outline' : 'sparkles-outline'}
          size={13}
          color={isUser ? Colors.primary : Colors.success}
        />
        <Text
          style={[
            styles.bubbleLabel,
            isUser ? styles.userBubbleLabel : styles.assistantBubbleLabel,
          ]}
        >
          {isUser ? '你' : 'MEGO AI'}
        </Text>
      </View>
      <Text style={styles.bubbleText}>{item.text}</Text>
      {!isUser && !!item.sources?.length && (
        <View style={styles.sources}>
          <Ionicons name="document-text-outline" size={13} color={Colors.success} />
          <Text style={styles.sourcesText}>
            參考 MEGO 紀錄：{item.sources.map((source) => source.label).join('、')}
          </Text>
        </View>
      )}
    </View>
  );
}

export function AIChatEmptyConversation({
  onSend,
  onOpenVetBrief,
}: {
  onSend: (prompt: string) => void;
  onOpenVetBrief: () => void;
}) {
  return (
    <View style={styles.emptyConversation}>
      <View style={styles.emptyConversationIcon}>
        <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.primary} />
      </View>
      <Text style={styles.emptyConversationTitle}>從一個問題開始</Text>
      <Text style={styles.intro}>
        可以詢問毛孩照護紀錄，也可以問一般生活與知識問題。疾病診斷與用藥仍請交由獸醫判斷。
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="準備看醫生"
        style={styles.vetTool}
        onPress={onOpenVetBrief}
      >
        <Ionicons name="medkit-outline" size={19} color="#5F9274" />
        <View style={styles.vetToolText}>
          <Text style={styles.vetToolTitle}>準備看醫生</Text>
          <Text style={styles.vetToolHint}>整理近期紀錄，帶著重點和獸醫溝通</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#8A8179" />
      </TouchableOpacity>
      <Text style={styles.quickPromptTitle}>可以先問問看</Text>
      <View style={styles.quickPrompts}>
        {QUICK_PROMPTS.map((prompt) => (
          <TouchableOpacity
            key={prompt}
            accessibilityRole="button"
            accessibilityLabel={`快速提問：${prompt}`}
            style={styles.quickPrompt}
            onPress={() => onSend(prompt)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.success} />
            <Text style={styles.quickPromptText}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  vetTool: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: Colors.successSoft,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickPromptTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginTop: 4 },
  quickPrompts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickPromptText: { flex: 1, marginLeft: 6, color: Colors.text, fontSize: 13, fontWeight: '600' },
  vetToolText: { flex: 1, marginLeft: 10 },
  vetToolTitle: { color: Colors.success, fontWeight: '700', fontSize: 15 },
  vetToolHint: { color: Colors.subtext, fontSize: 12, marginTop: 3 },
  emptyConversation: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 22,
    padding: 17,
    gap: 12,
  },
  emptyConversationIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyConversationTitle: { color: Colors.text, fontSize: 17, fontWeight: '800', marginBottom: -6 },
  intro: { color: Colors.subtext, lineHeight: 21, fontSize: 14, textAlign: 'center' },
  bubble: { maxWidth: '90%', paddingHorizontal: 16, paddingVertical: 13, borderRadius: 20 },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primarySoft,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 6,
  },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  bubbleLabel: { fontSize: 11, fontWeight: '800' },
  userBubbleLabel: { color: Colors.primary },
  assistantBubbleLabel: { color: Colors.success },
  bubbleText: { color: Colors.text, lineHeight: 23, fontSize: 16 },
  sources: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  sourcesText: { flex: 1, color: Colors.success, fontSize: 12, lineHeight: 17 },
});
