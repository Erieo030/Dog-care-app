/** 用途：AI 助手入口，集中整理 AI 查詢與健康紀錄入口。 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { Colors } from '../constants/Colors';
import { HomeStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import {
  activateAISession,
  activateEmptyAISession,
  deleteAISession,
  loadAISessions,
  AISessionRecord,
} from '../services/aiSessionService';
import { AIConversationSessionRow } from '../features/ai/components/AIConversationSessionRow';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { acceptAIDataConsent, getAIDataConsent } from '../services/aiDataConsentService';

type Props = NativeStackScreenProps<HomeStackParamList, 'HealthOverview'>;

export default function AIAssistantHubScreen({ navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [sessions, setSessions] = useState<AISessionRecord[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState(false);
  const [consentVisible, setConsentVisible] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);
  const [consentLoaded, setConsentLoaded] = useState(false);
  const [consentOwnerId, setConsentOwnerId] = useState('');
  const pendingAIAction = React.useRef<(() => Promise<void>) | null>(null);
  const loadedOwnerRef = React.useRef('');
  const ownerKey = session?.userId && selectedPet?.id ? `${session.userId}:${selectedPet.id}` : '';
  const refreshSessions = useCallback(() => {
    let active = true;
    if (!session?.userId || !selectedPet?.id) {
      setSessionsLoading(false);
      return () => {
        active = false;
      };
    }
    // Keep the current session list visible while the same owner refreshes it.
    // Show the loader only for the first load or when switching account/pet.
    setSessionsLoading(loadedOwnerRef.current !== ownerKey);
    setSessionsError(false);
    loadAISessions(session.userId, selectedPet.id)
      .then((items) => {
        if (!active) return;
        setSessions(items);
        loadedOwnerRef.current = ownerKey;
      })
      .catch(() => {
        if (active) setSessionsError(true);
      })
      .finally(() => {
        if (active) setSessionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ownerKey, session?.userId, selectedPet?.id]);
  useFocusEffect(refreshSessions);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (session?.userId) {
        getAIDataConsent(session.userId)
          .then((result) => {
            if (!active) return;
            setConsentGranted(result.accepted);
            setConsentLoaded(true);
            setConsentOwnerId(session.userId);
          })
          .catch(() => {
            if (!active) return;
            setConsentGranted(false);
            setConsentLoaded(true);
            setConsentOwnerId(session.userId);
          });
      }
      return () => { active = false; };
    }, [session?.userId]),
  );
  const withAIConsent = useCallback(async (action: () => Promise<void>) => {
    if (!session?.userId || !selectedPet?.id) return;
    let granted = consentGranted;
    if (!consentLoaded || consentOwnerId !== session.userId) {
      try {
        granted = (await getAIDataConsent(session.userId)).accepted;
        setConsentGranted(granted);
        setConsentLoaded(true);
        setConsentOwnerId(session.userId);
      } catch {
        granted = false;
      }
    }
    if (granted) {
      await action();
      return;
    }
    pendingAIAction.current = action;
    setConsentVisible(true);
  }, [consentGranted, consentLoaded, consentOwnerId, selectedPet?.id, session?.userId]);
  const openAssistant = useCallback(() => withAIConsent(async () => {
    if (!session?.userId || !selectedPet?.id) return;
    const begin = async () => {
      await activateEmptyAISession(session.userId, selectedPet.id);
      navigation.navigate('AIChat');
    };
    if (sessions.length < 5) return begin();
    const oldest = [...sessions].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
    Alert.alert('對話已達 5 個', `建立新對話會刪除最舊的「${oldest.title}」。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除並建立',
        style: 'destructive',
        onPress: async () => {
          await deleteAISession(session.userId, selectedPet.id, oldest.id);
          setSessions((items) => items.filter((item) => item.id !== oldest.id));
          await begin();
        },
      },
    ]);
  }), [navigation, selectedPet?.id, session?.userId, sessions, withAIConsent]);
  const confirmAIDataConsent = async () => {
    if (!session?.userId || consentSaving) return;
    setConsentSaving(true);
    try {
      await acceptAIDataConsent(session.userId);
      setConsentGranted(true);
      setConsentLoaded(true);
      setConsentOwnerId(session.userId);
      setConsentVisible(false);
      const action = pendingAIAction.current;
      pendingAIAction.current = null;
      await action?.();
    } catch (error) {
      Alert.alert('暫時無法記錄確認', (error as Error).message || '請確認網路連線後再試。');
    } finally {
      setConsentSaving(false);
    }
  };
  const deferAIDataConsent = () => {
    pendingAIAction.current = null;
    setConsentVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}>
        <View style={styles.petHeader}>
          {selectedPet?.avatarUrl ? (
            <Image source={{ uri: selectedPet.avatarUrl }} style={styles.petAvatar} />
          ) : (
            <View style={styles.petAvatarFallback}>
              <Ionicons name="paw-outline" size={23} color={Colors.primary} />
            </View>
          )}
          <View style={styles.petHeaderText}>
            <Text style={styles.eyebrow}>MEGO AI 助手</Text>
            <Text style={styles.title}>和 {selectedPet?.name || '毛孩'} 一起整理</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>把散落的照護紀錄，整理成容易理解的答案。</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="開始新的 MEGO AI 對話"
          style={styles.startButton}
          onPress={openAssistant}
        >
          <View style={styles.startButtonLabel}>
            <View style={styles.startButtonIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.petHeaderText}>
              <Text style={styles.startButtonText}>開始新的對話</Text>
              <Text style={styles.startButtonHint}>
                和 {selectedPet?.name || '毛孩'} 一起整理照護
              </Text>
            </View>
          </View>
          <Text style={styles.startButtonArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>最近對話</Text>
          <Text style={styles.sectionHint}>最多保留 5 個</Text>
        </View>
        {sessionsLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>正在整理最近對話…</Text>
          </View>
        ) : sessionsError ? (
          <View style={styles.loadError}>
            <Text style={styles.empty}>最近對話暫時載入失敗</Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.retryButton}
              onPress={refreshSessions}
            >
              <Text style={styles.retryText}>再試一次</Text>
            </TouchableOpacity>
          </View>
        ) : sessions.length ? (
          sessions.map((item) => (
            <AIConversationSessionRow
              key={item.id}
              item={item}
              onOpen={() => withAIConsent(async () => {
                if (!session?.userId || !selectedPet?.id) return;
                await activateAISession(session.userId, selectedPet.id, item);
                navigation.navigate('AIChat');
              })}
              onDelete={() =>
                Alert.alert('刪除對話？', `將刪除「${item.title}」，此動作無法復原。`, [
                  { text: '取消', style: 'cancel' },
                  {
                    text: '刪除',
                    style: 'destructive',
                    onPress: async () => {
                      if (!session?.userId || !selectedPet?.id) return;
                      await deleteAISession(session.userId, selectedPet.id, item.id);
                      setSessions((items) => items.filter((entry) => entry.id !== item.id));
                    },
                  },
                ])
              }
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="paw-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.empty}>還沒有對話，從一次照護提問開始吧。</Text>
          </View>
        )}
      </ScrollView>
      <Modal
        visible={consentVisible}
        transparent
        animationType="fade"
        onRequestClose={deferAIDataConsent}
      >
        <View style={styles.consentBackdrop}>
          <View style={styles.consentDialog}>
            <View style={styles.consentIcon}>
              <Ionicons name="lock-closed-outline" size={23} color={Colors.primary} />
            </View>
            <Text style={styles.consentTitle}>開始使用 MEGO AI 前</Text>
            <Text style={styles.consentBody}>
              你輸入的問題會傳送至 MEGO 設定的 AI 服務產生回覆。當問題需要個人化照護資訊時，MEGO 也會傳送回答所需的毛孩資料或紀錄，例如基本資料、過敏／慢性病、日常觀察或相關照護紀錄。資料只會依問題選取必要範圍；一般生活問題不會附帶毛孩紀錄。
            </Text>
            <Text style={styles.consentFootnote}>
              AI 回覆可能不完全正確，不能取代獸醫診斷。完整內容可在「設定 → AI 助手 → AI 資料使用說明」查看。
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.consentPrimary, consentSaving && styles.consentDisabled]}
              onPress={() => void confirmAIDataConsent()}
              disabled={consentSaving}
            >
              <Text style={styles.consentPrimaryText}>
                {consentSaving ? '正在記錄…' : '我了解，繼續使用 MEGO AI'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.consentLater}
              onPress={deferAIDataConsent}
              disabled={consentSaving}
            >
              <Text style={styles.consentLaterText}>稍後再說</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  petHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  petAvatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    marginRight: 13,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  petAvatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 18,
    marginRight: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  petHeaderText: { flex: 1 },
  eyebrow: { color: Colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  title: { color: Colors.text, fontSize: 25, fontWeight: '800', marginTop: 2 },
  subtitle: { color: Colors.subtext, lineHeight: 21, marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionHint: { color: Colors.subtext, fontSize: 12 },
  empty: { color: Colors.subtext, paddingVertical: 12 },
  loadError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
  },
  retryText: { color: Colors.primary, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  loadingText: { color: Colors.subtext, marginLeft: 8 },
  emptyState: {
    alignItems: 'center',
    padding: 18,
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },

  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    borderRadius: 18,
    paddingHorizontal: 16,
    minHeight: 68,
    marginTop: 8,
  },
  startButtonLabel: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 8,
  },
  startButtonIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#FFF4E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
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
  recommended: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: '#DCEFE1',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  text: { color: Colors.subtext, marginTop: 4 },
  consentBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(35, 27, 22, 0.48)',
  },
  consentDialog: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  consentIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
    marginBottom: 12,
  },
  consentTitle: { color: Colors.text, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  consentBody: { color: Colors.text, fontSize: 14, lineHeight: 22 },
  consentFootnote: { color: Colors.subtext, fontSize: 12, lineHeight: 19, marginTop: 12 },
  consentPrimary: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingHorizontal: 12,
  },
  consentPrimaryText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  consentDisabled: { opacity: 0.65 },
  consentLater: { alignItems: 'center', padding: 12, marginTop: 2 },
  consentLaterText: { color: Colors.subtext, fontSize: 14, fontWeight: '700' },
});
