/** 用途：AI 助手入口，集中整理 AI 查詢與健康紀錄入口。 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, PanResponder, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { Colors } from '../constants/Colors';
import { HomeStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { activateAISession, activateEmptyAISession, deleteAISession, loadAISessions, AISessionRecord } from '../services/aiSessionService';

type Props = NativeStackScreenProps<HomeStackParamList, 'HealthOverview'>;

const DELETE_WIDTH = 72;

const SessionSwipeRow = React.memo(function SessionSwipeRow({ item, onOpen, onDelete }: { item: AISessionRecord; onOpen: () => void; onDelete: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opened = useRef(false);
  const settle = useCallback((open: boolean) => {
    opened.current = open;
    Animated.spring(translateX, { toValue: open ? -DELETE_WIDTH : 0, useNativeDriver: true, bounciness: 0 }).start();
  }, [translateX]);
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => {
      const origin = opened.current ? -DELETE_WIDTH : 0;
      translateX.setValue(Math.max(-DELETE_WIDTH, Math.min(0, origin + gesture.dx)));
    },
    onPanResponderRelease: (_, gesture) => settle(gesture.dx < -24 || (opened.current && gesture.dx < 24)),
    onPanResponderTerminate: () => settle(opened.current),
  }), [settle, translateX]);

  return <View style={styles.sessionWrap}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`刪除對話：${item.title}`} style={styles.deleteAction} onPress={onDelete}><Text style={styles.deleteText}>刪除</Text></TouchableOpacity>
    <Animated.View {...panResponder.panHandlers} style={[styles.sessionForeground, { transform: [{ translateX }] }]}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`開啟對話：${item.title}`} style={styles.session} onPress={() => opened.current ? settle(false) : onOpen()}>
        <View style={styles.sessionIcon}><Ionicons name="chatbubble-ellipses-outline" size={19} color={Colors.success} /></View>
        <View style={styles.sessionBody}><Text style={styles.sessionTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.sessionMeta}>{new Date(item.updatedAt).toLocaleDateString('zh-TW')} · {item.messages.length} 則訊息</Text></View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  </View>;
});

export default function AIAssistantHubScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [sessions, setSessions] = useState<AISessionRecord[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState(false);
  const refreshSessions = useCallback(() => {
    if (!session?.userId || !selectedPet?.id) { setSessionsLoading(false); return; }
    setSessionsLoading(true);
    setSessionsError(false);
    loadAISessions(session.userId, selectedPet.id)
      .then(setSessions)
      .catch(() => setSessionsError(true))
      .finally(() => setSessionsLoading(false));
  }, [session?.userId, selectedPet?.id]);
  useFocusEffect(refreshSessions);
  const openAssistant = useCallback(async () => {
    if (!session?.userId || !selectedPet?.id) return;
    const begin = async () => {
      await activateEmptyAISession(session.userId, selectedPet.id);
      navigation.navigate('AIChat');
    };
    if (sessions.length < 5) return begin();
    const oldest = [...sessions].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
    Alert.alert('對話已達 5 個', `建立新對話會刪除最舊的「${oldest.title}」。`, [
      { text: '取消', style: 'cancel' },
      { text: '刪除並建立', style: 'destructive', onPress: async () => { await deleteAISession(session.userId, selectedPet.id, oldest.id); setSessions((items) => items.filter((item) => item.id !== oldest.id)); await begin(); } },
    ]);
  }, [navigation, selectedPet?.id, session?.userId, sessions]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.petHeader}>
          {selectedPet?.avatarUrl ? <Image source={{ uri: selectedPet.avatarUrl }} style={styles.petAvatar} /> : <View style={styles.petAvatarFallback}><Ionicons name="paw-outline" size={23} color={Colors.primary} /></View>}
          <View style={styles.petHeaderText}><Text style={styles.eyebrow}>MEGO AI 助手</Text><Text style={styles.title}>和 {selectedPet?.name || '毛孩'} 一起整理</Text></View>
        </View>
        <Text style={styles.subtitle}>把散落的照護紀錄，整理成容易理解的答案。</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="開始新的 MEGO AI 對話" style={styles.startButton} onPress={openAssistant}>
          <View style={styles.startButtonLabel}>
            <View style={styles.startButtonIcon}><Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.primary} /></View>
            <View style={styles.petHeaderText}>
              <Text style={styles.startButtonText}>開始新的對話</Text>
              <Text style={styles.startButtonHint}>和 {selectedPet?.name || '毛孩'} 一起整理照護</Text>
            </View>
          </View>
          <Text style={styles.startButtonArrow}>›</Text>
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>最近對話</Text>
        {sessionsLoading ? <View style={styles.loadingRow}><ActivityIndicator size="small" color={Colors.primary} /><Text style={styles.loadingText}>正在整理最近對話…</Text></View> : sessionsError ? <View style={styles.loadError}><Text style={styles.empty}>最近對話暫時載入失敗</Text><TouchableOpacity accessibilityRole="button" style={styles.retryButton} onPress={refreshSessions}><Text style={styles.retryText}>再試一次</Text></TouchableOpacity></View> : sessions.length ? sessions.map((item) => <SessionSwipeRow key={item.id} item={item} onOpen={async () => { if (!session?.userId || !selectedPet?.id) return; await activateAISession(session.userId, selectedPet.id, item); navigation.navigate('AIChat'); }} onDelete={() => Alert.alert('刪除對話？', `將刪除「${item.title}」，此動作無法復原。`, [{ text: '取消', style: 'cancel' }, { text: '刪除', style: 'destructive', onPress: async () => { if (!session?.userId || !selectedPet?.id) return; await deleteAISession(session.userId, selectedPet.id, item.id); setSessions((items) => items.filter((entry) => entry.id !== item.id)); } }])} />) : <View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons name="paw-outline" size={24} color={Colors.primary} /></View><Text style={styles.empty}>還沒有對話，從一次照護提問開始吧。</Text></View>}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 36 },
  petHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  petAvatar: { width: 54, height: 54, borderRadius: 18, marginRight: 13 },
  petAvatarFallback: { width: 54, height: 54, borderRadius: 18, marginRight: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft },
  petHeaderText: { flex: 1 },
  eyebrow: { color: Colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  title: { color: Colors.text, fontSize: 25, fontWeight: '800', marginTop: 2 },
  subtitle: { color: Colors.subtext, lineHeight: 21, marginBottom: 14 },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  sessionWrap: { minHeight: 68, overflow: 'hidden', borderRadius: 18, marginBottom: 8 },
  sessionForeground: { backgroundColor: Colors.surface },
  deleteAction: { position: 'absolute', right: 0, top: 0, bottom: 0, width: DELETE_WIDTH, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center' }, deleteText: { color: '#FFF', fontWeight: '700' },
  session: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  sessionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sessionBody: { flex: 1 }, sessionTitle: { color: Colors.text, fontWeight: '700' }, sessionMeta: { color: Colors.subtext, fontSize: 12, marginTop: 3 }, chevron: { color: Colors.subtext, fontSize: 24 }, empty: { color: Colors.subtext, paddingVertical: 12 }, loadError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, retryButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.primarySoft }, retryText: { color: Colors.primary, fontWeight: '700' }, loadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }, loadingText: { color: Colors.subtext, marginLeft: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 18 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },

  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, borderRadius: 18, paddingHorizontal: 16, minHeight: 68, marginTop: 8 },
  startButtonLabel: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingRight: 8 },
  startButtonIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#FFF4E8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  startButtonText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  startButtonHint: { color: '#F8DCC8', fontSize: 12, marginTop: 3 },
  startButtonArrow: { color: '#FFF', fontSize: 28, lineHeight: 28 },
  card: {
    minHeight: 72,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#8B684D',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredCard: { backgroundColor: '#F1F8F2', borderColor: '#C9E3D0' },
  cardContent: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recommended: { color: Colors.primary, fontSize: 11, fontWeight: '700', backgroundColor: '#DCEFE1', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  text: { color: Colors.subtext, marginTop: 4 },
});
