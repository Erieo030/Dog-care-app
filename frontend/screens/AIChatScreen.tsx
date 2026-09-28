import React, { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  KeyboardAvoidingView,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { sendAIChat, AIUsage } from '../services/aiService';
import { loadAISession, saveActiveAISession } from '../services/aiSessionService';
import { Colors } from '../constants/Colors';
import {
  AIChatEmptyConversation,
  AIChatMessage,
  AIChatMessageBubble,
} from '../features/ai/components/AIChatContent';

function KeyboardScrollSpacer() {
  const { height } = useReanimatedKeyboardAnimation();
  const spacerStyle = useAnimatedStyle(() => ({ height: Math.max(0, -height.value) }));
  return <Animated.View style={spacerStyle} />;
}

export default function AIChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<FlatList<AIChatMessage>>(null);
  const shouldScrollToEndRef = useRef(false);
  const isNearEndRef = useRef(true);
  const refreshActiveSession = React.useCallback(() => {
    let active = true;
    if (!session?.userId || !selectedPet?.id) return;
    loadAISession(session.userId, selectedPet.id)
      .then((saved) => {
        if (!active) return;
        shouldScrollToEndRef.current = true;
        setMessages(saved.messages || []);
        if (saved.usage) setUsage(saved.usage);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [session?.userId, selectedPet?.id]);
  useFocusEffect(refreshActiveSession);
  const send = async (value = input) => {
    const text = value.trim();
    if (!text || !session?.userId || !selectedPet || loading) return;
    setInput('');
    setError('');
    shouldScrollToEndRef.current = true;
    setMessages((items) => [...items, { role: 'user', text }]);
    setLoading(true);
    try {
      const result = await sendAIChat(session.userId, selectedPet.id, text);
      const assistantText = result.errorMessage
        ? result.answer + '\n' + result.errorMessage
        : result.answer;
      const nextMessages: AIChatMessage[] = [
        ...messages,
        { role: 'user', text },
        { role: 'assistant', text: assistantText, result, sources: result.sources },
      ];
      shouldScrollToEndRef.current = isNearEndRef.current;
      setMessages(nextMessages);
      if (result.usage) setUsage(result.usage);
      await saveActiveAISession(
        session.userId,
        selectedPet.id,
        nextMessages.map(({ role, text: messageText, sources }) => ({ role, text: messageText, sources })),
        result.usage,
      );
    } catch (e) {
      setError((e as Error).message || '目前無法取得回覆');
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safeArea}>
      <KeyboardAvoidingView
        style={s.root}
        contentContainerStyle={s.keyboardContent}
        behavior="position"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          style={s.list}
          data={messages}
          keyExtractor={(item, index) => `${item.role}-${index}`}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            isNearEndRef.current =
              contentSize.height - (contentOffset.y + layoutMeasurement.height) < 96;
          }}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            if (!shouldScrollToEndRef.current) return;
            shouldScrollToEndRef.current = false;
            requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
          }}
          ListHeaderComponent={
            <View>
              <View style={s.header}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="返回上一頁"
                  style={s.headerAction}
                  onPress={() => {
                    if (navigation.canGoBack()) navigation.goBack();
                    else navigation.navigate('HealthOverview');
                  }}
                >
                  <Ionicons name="chevron-back" size={22} color={Colors.text} />
                </TouchableOpacity>
                <View style={s.titleBody}>
                  <Text style={s.eyebrow}>MEGO AI</Text>
                  <Text style={s.title}>與 {selectedPet?.name || '毛孩'} 對話</Text>
                </View>
                {selectedPet?.avatarUrl ? (
                  <Image source={{ uri: selectedPet.avatarUrl }} style={s.avatar} />
                ) : (
                  <View style={s.avatarFallback}>
                    <Ionicons name="paw-outline" size={19} color={Colors.primary} />
                  </View>
                )}
              </View>
              {usage && (
                <View style={s.usageBadge}>
                  <Ionicons name="sparkles-outline" size={14} color={Colors.primary} />
                  <Text style={s.usage}>
                    {usage.unlimited
                      ? `今日已用 ${usage.used} 次 · 不限次數`
                      : `今日已用 ${usage.used} 次 · 還有 ${usage.remaining} 次`}
                  </Text>
                </View>
              )}
              <Text style={s.subtitle}>查詢照護紀錄，也能協助一般生活與知識問題</Text>
              {!messages.length && (
                <AIChatEmptyConversation
                  onSend={send}
                  onOpenVetBrief={() => navigation.navigate('VetVisitBrief')}
                />
              )}
            </View>
          }
          renderItem={({ item }) => <AIChatMessageBubble item={item} />}
          ListFooterComponent={
            <>
              {loading && <Text style={s.muted}>正在整理紀錄…</Text>}
              {error && <Text style={s.error}>{error}</Text>}
              <Text style={s.disclaimer}>
                MEGO AI 依 App 中已記錄的資料提供整理與查詢，不提供疾病診斷或藥物處方。
              </Text>
              <KeyboardScrollSpacer />
            </>
          }
        />
        <View style={s.composer}>
          <View style={s.inputShell}>
            <TextInput
              style={s.input}
              value={input}
              onChangeText={setInput}
              placeholder="問問毛孩的照護狀況…"
              placeholderTextColor={Colors.subtext}
              maxLength={1000}
              onSubmitEditing={() => send()}
              returnKeyType="send"
            />
            <TouchableOpacity
              accessibilityLabel="送出問題"
              style={[s.send, loading && s.sendDisabled]}
              onPress={() => send()}
              disabled={loading}
            >
              <Ionicons name="arrow-up" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safeArea: { flex: 1, overflow: 'hidden', backgroundColor: Colors.background },
  root: { flex: 1, backgroundColor: Colors.background },
  keyboardContent: { flex: 1 },
  list: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 7,
  },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, gap: 12 },
  titleBody: { flex: 1, marginLeft: 8 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: Colors.primary },
  title: { fontSize: 23, fontWeight: '800', color: Colors.text, marginTop: 2 },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: { width: 46, height: 46, borderRadius: 16 },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usageBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
  },
  usage: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  subtitle: {
    marginTop: 8,
    marginBottom: 12,
    color: Colors.subtext,
    fontSize: 15,
    lineHeight: 22,
  },
  muted: { color: Colors.subtext },
  error: { color: Colors.danger },
  disclaimer: { fontSize: 12, color: Colors.subtext, marginTop: 12, lineHeight: 18 },
  composer: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  inputShell: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    paddingLeft: 20,
    paddingRight: 70,
    color: Colors.text,
    backgroundColor: Colors.surfaceSoft,
    fontSize: 16,
  },
  send: {
    position: 'absolute',
    right: 5,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: Colors.primary,
  },
  sendDisabled: { opacity: 0.52 },
});
