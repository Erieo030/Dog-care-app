/** 用途：首頁照護入口、今日待辦與近期健康觀察。 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { HomeBackgroundScene } from '../components/home/HomeBackgroundScene';
import { SoftButton, SoftEntrance } from '../components/SoftMotion';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import { getHealthDashboard } from '../services/dashboardService';
import { getTodayReminders } from '../services/reminderService';
import { getHealthMonitor, HealthMonitorResult } from '../services/aiService';
import { reconcileAccountNotifications } from '../services/notificationService';

type Navigation = NativeStackNavigationProp<HomeStackParamList>;
type Icon = keyof typeof Ionicons.glyphMap;
const LOGO = require('../assets/home-scene/logo.png');
const SHORTCUTS: [Icon, string, keyof HomeStackParamList][] = [
  ['journal-outline', '日常', 'DailyLog'],
  ['alert-circle-outline', '記錄異常', 'AbnormalType'],
  ['scale-outline', '體重', 'WeightList'],
  ['notifications-outline', '提醒', 'ReminderList'],
];
const HEALTH_ACTIONS: [Icon, string, keyof HomeStackParamList][] = [
  ['medkit-outline', '疫苗', 'VaccinationList'],
  ['shield-checkmark-outline', '驅蟲', 'DewormingList'],
  ['medical-outline', '用藥', 'MedicationList'],
  ['business-outline', '就醫', 'MedicalVisitList'],
];
const calculateAge = (value?: string) => {
  if (!value) return '年齡未設定';
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return '年齡未設定';
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  )
    years--;
  return years > 0 ? `${years} 歲` : '未滿 1 歲';
};

export default function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const { height } = useWindowDimensions();
  const { session } = useAuth();
  const {
    pets,
    selectedPet,
    selectPet,
    refreshPets,
    isLoading: petLoading,
    error: petError,
  } = usePet();
  const [monitor, setMonitor] = useState<HealthMonitorResult | null>(null);
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resultOwner, setResultOwner] = useState('');
  const requestRef = useRef(0);
  const ownerRef = useRef('');
  const ownerKey = session && selectedPet ? `${session.userId}:${selectedPet.id}` : '';
  const petId = selectedPet?.id;

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestRef.current === requestId;
    if (!session?.userId || !petId) {
      setLoading(false);
      return;
    }
    if (ownerRef.current !== ownerKey) {
      ownerRef.current = ownerKey;
      setTodayCount(null);
      setMonitor(null);
      setResultOwner(ownerKey);
    }
    setLoading(true);
    setError('');
    try {
      await getHealthDashboard(session.userId, petId, 30);
      if (!isCurrent()) return;
      setLoading(false);
      // 每次載入以序號隔離；切換毛孩、離頁或重試後，不接受舊回應。
      const results = await Promise.allSettled([
        getTodayReminders(session.userId, petId).then((reminders) => {
          if (isCurrent())
            setTodayCount(
              reminders.filter((item) => item.status === 'pending' || item.status === 'snoozed')
                .length,
            );
        }),
        getHealthMonitor(session.userId, petId, 30).then((result) => {
          if (isCurrent()) setMonitor(result);
        }),
      ]);
      if (isCurrent() && results.some((result) => result.status === 'rejected'))
        setError('部分照護資料更新失敗');
    } catch {
      if (isCurrent()) {
        setError('照護資料更新失敗');
        setLoading(false);
      }
    }
  }, [session?.userId, petId, ownerKey]);
  useFocusEffect(
    useCallback(() => {
      void load();
      if (session?.userId)
        reconcileAccountNotifications(session.userId, pets).catch(() => undefined);
      return () => {
        requestRef.current++;
      };
    }, [load, session?.userId, pets]),
  );
  const refresh = () => {
    void load();
    void refreshPets().catch(() => undefined);
  };
  const openRoute = useCallback(
    (route: keyof HomeStackParamList) => {
      if (route === 'ReminderList') navigation.navigate('ReminderList', { upcomingDays: 7 });
      else navigation.navigate(route as never);
    },
    [navigation],
  );
  const ready = resultOwner === ownerKey;
  const reminders = ready ? todayCount : null;
  const observations = ready ? monitor : null;
  const compact = height < 760;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.container}>
      <StatusBar style="dark" />
      <HomeBackgroundScene />
      {!selectedPet ? (
        <View style={s.center}>
          {petLoading && <ActivityIndicator color={Colors.primary} />}
          <Text style={s.mutedSmall}>
            {petLoading ? '正在整理今天的照護…' : petError || '尚無毛孩資料'}
          </Text>
          {!petLoading && (
            <SoftButton onPress={refresh} style={s.retry}>
              <Text style={s.retryText}>重新整理</Text>
            </SoftButton>
          )}
        </View>
      ) : (
        <SoftEntrance
          style={[
            s.content,
            { paddingTop: compact ? 16 : Math.max(48, Math.min(Math.round(height * 0.05), 72)) },
          ]}
        >
          <SoftEntrance key={selectedPet.id} style={s.headerSurface}>
            <View style={s.headerCopy}>
              <View style={s.brandMark}>
                <Image source={LOGO} style={s.logo} />
                <Text style={s.eyebrow}>MEGO</Text>
              </View>
              <Text style={s.pageTitle}>今天也一起好好生活</Text>
            </View>
            <SoftButton
              accessibilityRole="button"
              accessibilityLabel="編輯目前毛孩"
              style={s.petSummary}
              onPress={() => navigation.navigate('EditPet')}
            >
              {selectedPet.avatarUrl ? (
                <Image source={{ uri: selectedPet.avatarUrl }} style={s.avatarSmall} />
              ) : (
                <View style={s.avatarFallbackSmall}>
                  <Ionicons name="paw-outline" size={22} color={Colors.primary} />
                </View>
              )}
              <View style={s.flex}>
                <Text style={s.petNameSmall} numberOfLines={1}>
                  {selectedPet.name}
                </Text>
                <Text style={s.mutedSmall} numberOfLines={1}>
                  {selectedPet.breed || '品種未設定'} · {calculateAge(selectedPet.birthDate)}
                </Text>
              </View>
              <Text style={s.link}>編輯</Text>
            </SoftButton>
            {pets.length > 1 && (
              <View style={s.switchRow}>
                <Text style={s.overlayHint}>切換毛孩</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.petSwitchCompact}
                >
                  {pets.map((pet) => (
                    <SoftButton
                      key={pet.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: pet.id === selectedPet.id }}
                      accessibilityLabel={`切換到${pet.name}`}
                      style={[s.chip, pet.id === selectedPet.id && s.chipActive]}
                      onPress={() => selectPet(pet.id)}
                    >
                      <Text style={[s.chipText, pet.id === selectedPet.id && s.chipTextActive]}>
                        {pet.name}
                      </Text>
                    </SoftButton>
                  ))}
                </ScrollView>
              </View>
            )}
          </SoftEntrance>
          <Text style={s.shortcutHeading}>今天想做什麼？</Text>
          <View style={[s.shortcutRow, compact && s.compactGap]}>
            {SHORTCUTS.map(([icon, label, route]) => (
              <Action key={route} icon={icon} label={label} route={route} onOpen={openRoute} />
            ))}
          </View>
          <View style={s.todayOverlay}>
            <View style={s.titleRow}>
              <Text style={[s.overlayTitle, s.flex]}>今天待做</Text>
              {loading && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>
            {error ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="重新載入照護資料"
                onPress={refresh}
                style={s.errorAction}
              >
                <Text style={s.overlayHint}>{error}，點此重試</Text>
              </TouchableOpacity>
            ) : null}
            <SoftButton
              accessibilityRole="button"
              accessibilityLabel="查看今日待辦"
              style={s.summaryAction}
              onPress={() => navigation.navigate('ReminderList', { upcomingDays: 0 })}
            >
              <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
              <Text style={s.todayStatusText}>今日待辦</Text>
              <Text style={s.link}>
                {reminders === null ? '查看' : reminders ? `${reminders} 項` : '無待辦'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.subtext} />
            </SoftButton>
            <SoftButton
              accessibilityRole="button"
              accessibilityLabel="查看健康觀察紀錄"
              style={[s.summaryAction, s.observationAction]}
              onPress={() => navigation.navigate('HealthEventList')}
            >
              <Ionicons name="heart-outline" size={18} color={Colors.success} />
              <Text style={s.todayStatusText}>健康觀察</Text>
              <Text style={s.overlayHint}>
                {observations ? `${observations.alerts.length} 項 · 近30天` : '查看紀錄'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.subtext} />
            </SoftButton>
          </View>
          <Text style={[s.shortcutHeading, s.managementHead, compact && s.compactGap]}>
            健康管理
          </Text>
          <View style={s.managementRow}>
            {HEALTH_ACTIONS.map(([icon, label, route]) => (
              <Action
                key={route}
                icon={icon}
                label={label}
                route={route}
                onOpen={openRoute}
                health
              />
            ))}
          </View>
          <SoftButton
            accessibilityRole="button"
            accessibilityLabel="開啟 MEGO AI 助手"
            style={[s.aiPill, compact && s.compactGap]}
            onPress={() => navigation.getParent()?.navigate('Health', { screen: 'HealthOverview' })}
          >
            <Ionicons name="sparkles-outline" size={20} color={Colors.primary} />
            <View style={s.flex}>
              <Text style={s.aiPillTitle}>MEGO AI</Text>
              <Text style={s.aiPillText}>一起了解毛孩最近的狀況</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.subtext} />
          </SoftButton>
        </SoftEntrance>
      )}
    </SafeAreaView>
  );
}
const Action = React.memo(function Action({
  icon,
  label,
  route,
  onOpen,
  health = false,
}: {
  icon: Icon;
  label: string;
  route: keyof HomeStackParamList;
  onOpen: (route: keyof HomeStackParamList) => void;
  health?: boolean;
}) {
  return (
    <SoftButton
      accessibilityRole="button"
      accessibilityLabel={label}
      style={s.shortcut}
      onPress={() => onOpen(route)}
    >
      <View style={[s.primaryIcon, health && s.healthIcon]}>
        <Ionicons name={icon} size={24} color={Colors.success} />
      </View>
      <View style={s.actionLabelProtection}>
        <Text style={s.shortcutLabel}>{label}</Text>
      </View>
    </SoftButton>
  );
});
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 12, zIndex: 1 },
  flex: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerCopy: { minWidth: 0 },
  headerSurface: {
    backgroundColor: 'rgba(255,250,242,0.28)',
    borderRadius: 22,
    padding: 4,
    marginBottom: 4,
  },
  brandMark: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  logo: { width: 30, height: 28, resizeMode: 'contain' },
  eyebrow: { color: Colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  pageTitle: {
    color: Colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    marginTop: 3,
    textShadowColor: 'rgba(255,250,242,0.72)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  petSummary: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,250,242,0.62)',
    borderRadius: 14,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 12,
    width: '100%',
    minHeight: 46,
  },
  avatarSmall: { width: 32, height: 32, borderRadius: 16 },
  avatarFallbackSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petNameSmall: { fontSize: 16, fontWeight: '900', color: Colors.text },
  mutedSmall: { color: Colors.subtext, fontSize: 12, marginTop: 3 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  petSwitchCompact: { gap: 6, paddingBottom: 2 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 13,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.successSoft, borderColor: Colors.success },
  chipText: { color: Colors.text },
  chipTextActive: { color: Colors.success, fontWeight: '800' },
  shortcutHeading: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(255,255,255,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  shortcutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 5,
    gap: 6,
  },
  shortcut: {
    flex: 1,
    minWidth: 0,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  primaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(239,248,239,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(95,146,116,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthIcon: { borderWidth: 0 },
  actionLabelProtection: {
    backgroundColor: 'rgba(250,247,239,0.72)',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  shortcutLabel: { color: Colors.text, fontSize: 11, fontWeight: '600' },
  todayOverlay: {
    backgroundColor: 'rgba(255,250,242,0.88)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
    marginBottom: 6,
  },
  overlayTitle: { color: Colors.text, fontSize: 16, fontWeight: '900' },
  summaryAction: { minHeight: 44, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  observationAction: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  todayStatusText: { color: Colors.text, fontSize: 12, lineHeight: 18, fontWeight: '700', flex: 1, minWidth: 0 },
  overlayHint: { color: Colors.subtext, fontSize: 11, marginTop: 3 },
  errorAction: { minHeight: 44, justifyContent: 'center' },
  link: { color: Colors.primary, fontWeight: '800', fontSize: 13 },
  managementHead: { marginTop: 24, marginBottom: 4 },
  managementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    marginBottom: 2,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,250,242,0.84)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 22,
    minHeight: 44,
  },
  aiPillTitle: { color: Colors.text, fontWeight: '900' },
  aiPillText: { color: '#554B43', fontSize: 11, marginTop: 1 },
  compactGap: { marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  retry: {
    backgroundColor: Colors.primary,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 16,
  },
  retryText: { color: Colors.surface, fontWeight: '800' },
});
