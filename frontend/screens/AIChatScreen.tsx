import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { sendAIChat, AIUsage } from '../services/aiService';
import { loadAISession, saveActiveAISession } from '../services/aiSessionService';
import { Colors } from '../constants/Colors';
import AuthenticatedPetAvatar from '../components/AuthenticatedPetAvatar';
import {
  AIChatEmptyConversation,
  AIChatMessage,
  AIChatMessageBubble,
} from '../features/ai/components/AIChatContent';

const CONTEXT_WARNING_TOKENS = 12000;

function KeyboardScrollSpacer() {
  const { height } = useReanimatedKeyboardAnimation();
  const spacerStyle = useAnimatedStyle(() => ({ height: Math.max(0, -height.value) }));
  return <Animated.View style={spacerStyle} />;
}

export default function AIChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionLoadError, setSessionLoadError] = useState('');
  const [error, setError] = useState('');
  const listRef = useRef<FlatList<AIChatMessage>>(null);
  const shouldScrollToEndRef = useRef(false);
  const isNearEndRef = useRef(true);
  const sessionRequestId = useRef(0);
  const sessionOwnerKey = useRef('');
  const loadSession = React.useCallback(async (isCurrent: () => boolean) => {
    if (!session?.userId || !selectedPet?.id) {
      sessionOwnerKey.current = '';
      setMessages([]);
      setActiveSessionId(undefined);
      setUsage(null);
      setSessionLoading(false);
      setSessionLoadError('');
      return;
    }
    const ownerKey = `${session.userId}:${selectedPet.id}`;
    if (sessionOwnerKey.current !== ownerKey) {
      sessionOwnerKey.current = ownerKey;
      setMessages([]);
      setActiveSessionId(undefined);
      setUsage(null);
    }
    setSessionLoading(true);
    setSessionLoadError('');
    try {
      const saved = await loadAISession(session.userId, selectedPet.id);
      if (!isCurrent()) return;
      shouldScrollToEndRef.current = true;
      setActiveSessionId(saved.sessionId);
      setMessages(saved.messages || []);
      setUsage(saved.usage ?? null);
    } catch {
      if (isCurrent()) {
        setSessionLoadError('無法讀取這段對話，為避免覆蓋原有內容，請先重新載入。');
      }
    } finally {
      if (isCurrent()) setSessionLoading(false);
    }
  }, [session?.userId, selectedPet?.id]);
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      const requestId = ++sessionRequestId.current;
      void loadSession(() => active && requestId === sessionRequestId.current);
      return () => {
        active = false;
        sessionRequestId.current += 1;
      };
    }, [loadSession]),
  );
  const retrySessionLoad = () => {
    const requestId = ++sessionRequestId.current;
    void loadSession(() => requestId === sessionRequestId.current);
  };
  const contextWarningVisible = messages.some(
    (message) =>
      message.role === 'assistant' &&
      (message.contextTokens ?? message.result?.contextTokens ?? 0) >= CONTEXT_WARNING_TOKENS,
  );
  const send = async (value = input) => {
    const text = value.trim();
    if (!text || !session?.userId || !selectedPet || loading || sessionLoading || sessionLoadError) return;
    setInput('');
    setError('');
    shouldScrollToEndRef.current = true;
    setMessages((items) => [...items, { role: 'user', text }]);
    setLoading(true);
    try {
      const history = messages.slice(-10).map(({ role, text: content }) => ({ role, content }));
      const result = await sendAIChat(
        session.userId,
        selectedPet.id,
        text,
        30,
        activeSessionId,
        'general',
        history,
      );
      if (result.errorCode) {
        setMessages((items) => {
          const last = items[items.length - 1];
          return last?.role === 'user' && last.text === text ? items.slice(0, -1) : items;
        });
        setInput(text);
        if (result.usage) setUsage(result.usage);
        setError(result.errorMessage || result.answer || '目前無法取得回覆，請稍後再試。');
        return;
      }
      const assistantText = result.errorMessage
        ? result.answer + '\n' + result.errorMessage
        : result.answer;
      const nextMessages: AIChatMessage[] = [
        ...messages,
        { role: 'user', text },
        {
          role: 'assistant',
          text: assistantText,
          result,
          sources: result.sources,
          knowledgeSources: result.knowledgeSources,
          contextTokens: result.contextTokens ?? undefined,
        },
      ];
      shouldScrollToEndRef.current = isNearEndRef.current;
      setMessages(nextMessages);
      if (result.usage) setUsage(result.usage);
      try {
        await saveActiveAISession(
          session.userId,
          selectedPet.id,
          nextMessages.map(({ role, text: messageText, sources, knowledgeSources, contextTokens }) => ({
            role,
            text: messageText,
            sources,
            knowledgeSources,
            contextTokens,
          })),
          result.usage,
        );
      } catch {
        setError('回覆已收到，但無法儲存到本機對話紀錄。');
      }
    } catch (e) {
      setMessages((items) => {
        const last = items[items.length - 1];
        return last?.role === 'user' && last.text === text ? items.slice(0, -1) : items;
      });
      setInput(text);
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
                    else
                      navigation.navigate('MainTabs', {
                        screen: 'Health',
                        params: { screen: 'HealthOverview' },
                      });
                  }}
                >
                  <Ionicons name="chevron-back" size={22} color={Colors.text} />
                </TouchableOpacity>
                <View style={s.titleBody}>
                  <Text style={s.eyebrow}>MEGO AI</Text>
                  <Text style={s.title}>與 {selectedPet?.name || '毛孩'} 對話</Text>
                </View>
                {selectedPet?.avatarAttachmentId ? (
                  <AuthenticatedPetAvatar
                    attachmentId={selectedPet.avatarAttachmentId}
                    userId={session?.userId || selectedPet.userId}
                    style={s.avatar}
                    fallback={
                      <View style={s.avatarFallback}>
                        <Ionicons name="paw-outline" size={19} color={Colors.primary} />
                      </View>
                    }
                  />
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
              {sessionLoading && (
                <View style={s.sessionState}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={s.muted}>正在讀取對話紀錄…</Text>
                </View>
              )}
              {!!sessionLoadError && (
                <View style={s.sessionState}>
                  <Text style={s.error}>{sessionLoadError}</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={s.sessionRetry}
                    onPress={retrySessionLoad}
                  >
                    <Text style={s.sessionRetryText}>重新載入</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!sessionLoading && !sessionLoadError && !messages.length && (
                <AIChatEmptyConversation
                  onSend={send}
                  onOpenVetBrief={() => navigation.push('VetVisitBrief')}
                />
              )}
            </View>
          }
          renderItem={({ item }) => <AIChatMessageBubble item={item} />}
          ListFooterComponent={
            <>
              {loading && <Text style={s.muted}>正在整理紀錄…</Text>}
              {!!error && (
                <View style={s.sendError}>
                  <Text style={s.error}>{error}</Text>
                  {!!input.trim() && !loading && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="重試送出問題"
                      style={s.sessionRetry}
                      onPress={() => void send(input)}
                    >
                      <Text style={s.sessionRetryText}>重試送出</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {contextWarningVisible && (
                <View style={s.contextWarning}>
                  <View style={s.contextWarningHeading}>
                    <Ionicons name="warning-outline" size={19} color="#A86B24" />
                    <Text style={s.contextWarningTitle}>這段對話的上下文已偏長</Text>
                  </View>
                  <Text style={s.contextWarningText}>
                    本次送出的內容已達約 12,000 tokens。為降低後續回覆超出模型可處理範圍的風險，建議返回 MEGO AI 主頁並另開新對話；目前對話仍會保留在最近對話中。
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="返回 MEGO AI 主頁，另開新對話"
                    style={s.contextWarningAction}
                    onPress={() => {
                      if (navigation.canGoBack()) navigation.goBack();
                      else
                        navigation.navigate('MainTabs', {
                          screen: 'Health',
                          params: { screen: 'HealthOverview' },
                        });
                    }}
                  >
                    <Text style={s.contextWarningActionText}>返回 AI 主頁另開對話</Text>
                    <Ionicons name="chevron-forward" size={15} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
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
              style={[s.send, (loading || sessionLoading || !!sessionLoadError) && s.sendDisabled]}
              onPress={() => send()}
              disabled={loading || sessionLoading || !!sessionLoadError}
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
  sessionState: { alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  sessionRetry: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
  },
  sessionRetryText: { color: Colors.primary, fontWeight: '700' },
  sendError: { alignItems: 'flex-start', gap: 8 },
  contextWarning: {
    marginTop: 12,
    padding: 13,
    gap: 7,
    borderRadius: 16,
    backgroundColor: '#FFF3DF',
    borderWidth: 1,
    borderColor: '#E9C990',
  },
  contextWarningHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  contextWarningTitle: { color: '#7A4C18', fontSize: 14, fontWeight: '800' },
  contextWarningText: { color: '#68513A', fontSize: 12, lineHeight: 18 },
  contextWarningAction: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 2 },
  contextWarningActionText: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
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
