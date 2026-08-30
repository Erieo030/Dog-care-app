/** 用途：首頁健康儀表板，整合目前毛孩的摘要、統計、圖表、時間軸與快速新增。 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { HomeBackgroundScene } from '../components/home/HomeBackgroundScene';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import { getHealthDashboard } from '../services/dashboardService';
import { getTodayReminders } from '../services/reminderService';
import { getHealthMonitor, HealthMonitorResult } from '../services/aiService';
import { reconcileAccountNotifications } from '../services/notificationService';
import { HealthDashboard } from '../types';

type Navigation = NativeStackNavigationProp<HomeStackParamList>;
type WeightPeriod = 7 | 30 | 90;
const SECTION_GAP = 14;
const ACTION_DIAMETER = 52;
const ACTION_ICON_SIZE = 24;
const ACTION_LABEL_GAP = 9;
const HOME_HORIZONTAL_PADDING = 16;
const QUICK_ACTION_HEADER_GAP = 16;
const HOME_BOTTOM_CLEARANCE = 104;
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
  const { height: viewportHeight } = useWindowDimensions();
  const topScenicZone = Math.max(48, Math.min(Math.round(viewportHeight * 0.05), 72));
  const homeContentTopOffset = topScenicZone;
  const { session } = useAuth();
  const {
    pets,
    selectedPet,
    selectPet,
    refreshPets,
    isLoading: petLoading,
    error: petError,
  } = usePet();
  const [data, setData] = useState<HealthDashboard | null>(null);
  const [monitor, setMonitor] = useState<HealthMonitorResult | null>(null);
  const [todayReminderCount, setTodayReminderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period] = useState<WeightPeriod>(30);
  const petRef = useRef<string | null>(null);
  const load = useCallback(async () => {
    if (!session?.userId || !selectedPet) {
      setData(null);
      setLoading(false);
      return;
    }
    const petId = selectedPet.id;
    if (petRef.current !== petId) {
      petRef.current = petId;
      setData(null);
      setMonitor(null);
      setTodayReminderCount(0);
      setLoading(true);
    }
    try {
      setError('');
      // 首屏只等待 Dashboard；AI 健康監測屬於次要資訊，背景載入不阻塞首頁。
      const result = await getHealthDashboard(session.userId, petId, period);
      if (petRef.current !== petId) return;
      setData(result);
      setLoading(false);

      getTodayReminders(session.userId, petId)
        .then((reminders) => {
          setTodayReminderCount(reminders.filter((item) => item.status === 'pending' || item.status === 'snoozed').length);
        })
        .catch(() => undefined);

      getHealthMonitor(session.userId, petId, period)
        .then((monitorResult) => {
          if (petRef.current === petId) setMonitor(monitorResult);
        })
        .catch(() => undefined);
    } catch (e) {
      if (petRef.current === petId) {
        setError((e as Error).message || '今天的照護載入失敗');
        setLoading(false);
        }
    }
  }, [session?.userId, selectedPet, period]);
  useFocusEffect(
    useCallback(() => {
      load();
      if (session?.userId)
        reconcileAccountNotifications(session.userId, pets).catch(() => undefined);
    }, [load, session?.userId, pets]),
  );
  const refresh = async () => {
    await Promise.all([refreshPets(), load()]);
  };
  const openHomeRoute = useCallback((route: string) => {
    if (route === 'ReminderList') {
      navigation.navigate('ReminderList', { upcomingDays: 7 });
      return;
    }
    navigation.navigate(route as never);
  }, [navigation]);
  const openTodaySummary = useCallback(() => {
    const hasReminders = todayReminderCount > 0;
    const hasHealthObservations = Boolean(monitor?.alerts.length);
    if (hasReminders && hasHealthObservations) {
      Alert.alert('今天的照護', '你有待辦事項與健康觀察，想先查看哪一項？', [
        { text: '待辦事項', onPress: () => navigation.navigate('ReminderList', { upcomingDays: 0 }) },
        { text: '健康觀察', onPress: () => navigation.navigate('HealthEventList') },
        { text: '取消', style: 'cancel' },
      ]);
    } else if (hasHealthObservations) {
      navigation.navigate('HealthEventList');
    } else {
      navigation.navigate('ReminderList', { upcomingDays: 0 });
    }
  }, [monitor?.alerts.length, navigation, todayReminderCount]);
  if (petLoading || loading) return <Center loading title="正在整理今天的照護…" />;
  if (petError || error || !selectedPet || !data)
    return <Center title={petError || error || '尚無毛孩資料'} action={refresh} />;
  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />
      <HomeBackgroundScene />
      <View style={[s.content, { paddingTop: homeContentTopOffset }]}>
        <View style={s.headerSurface}>
          <View style={s.titleRow}>
            <View style={s.flex}>
              <View style={s.brandMark}><Image source={require("../assets/home-scene/logo.png")} style={s.logo} /><Text style={s.eyebrow}>MEGO</Text></View>
              <Text style={s.pageTitle}>今天也陪 {data.pet.name} 好好生活</Text>
            </View>
            <TouchableOpacity accessibilityLabel="全域搜尋" style={s.globalSearch} onPress={() => navigation.navigate("GlobalSearch")}>
              <Ionicons name="search-outline" size={21} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="編輯目前毛孩" style={s.petSummary} onPress={() => navigation.navigate("EditPet")}>
            {data.pet.avatarUrl ? <Image source={{ uri: data.pet.avatarUrl }} style={s.avatarSmall} /> : (
              <View style={s.avatarFallbackSmall}><Ionicons name="paw-outline" size={22} color={Colors.primary} /></View>
            )}
            <View style={s.flex}>
              <Text style={s.petNameSmall} numberOfLines={1}>{data.pet.name}</Text>
              <Text style={s.mutedSmall} numberOfLines={1}>{data.pet.breed || "品種未設定"} · {calculateAge(data.pet.birthDate)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.subtext} />
          </TouchableOpacity>
          {pets.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.petSwitchCompact}>
              {pets.map((pet) => (
                <TouchableOpacity key={pet.id} accessibilityRole="button" accessibilityLabel={`切換到${pet.name}`} style={[s.chip, pet.id === selectedPet.id && s.chipActive]} onPress={() => selectPet(pet.id)}>
                  <Text style={[s.chipText, pet.id === selectedPet.id && s.chipTextActive]}>{pet.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <CareShortcuts onOpen={openHomeRoute} />

        <TouchableOpacity accessibilityRole="button" accessibilityLabel="查看今天待做" style={s.todayOverlay} onPress={openTodaySummary}>
          <View style={s.todayHeader}><Text style={s.overlayTitle}>今天待做</Text><Text style={s.link}>查看 ›</Text></View>
          <View style={s.todayStatusRow}>
            <Ionicons name={(todayReminderCount || monitor?.alerts.length) ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={18} color={(todayReminderCount || monitor?.alerts.length) ? Colors.primary : '#4E8A6C'} />
            <Text style={s.todayStatusText}>{todayReminderCount ? `${todayReminderCount} 個待辦${monitor?.alerts.length ? ` · ${monitor.alerts.length} 個健康觀察` : ""}` : monitor?.alerts.length ? `${monitor.alerts.length} 個健康觀察` : "今天沒有待辦"}</Text>
          </View>
          <Text style={s.overlayHint}>點擊查看與管理提醒</Text>
        </TouchableOpacity>

        <View style={s.managementHead}>
          <HomeSectionHeader title="健康管理" />
        </View>
        <View style={s.managementRow}>
          <ManagementAction icon="medkit-outline" label="疫苗" onPress={() => navigation.navigate('VaccinationList')} />
          <ManagementAction icon="shield-checkmark-outline" label="驅蟲" onPress={() => navigation.navigate('DewormingList')} />
          <ManagementAction icon="medical-outline" label="用藥" onPress={() => navigation.navigate('MedicationList')} />
          <ManagementAction icon="business-outline" label="就醫" onPress={() => navigation.navigate('MedicalVisitList')} />
        </View>

        <TouchableOpacity accessibilityRole="button" accessibilityLabel="開啟 MEGO AI 助手" style={s.aiPill} onPress={() => { const parent = navigation.getParent(); if (parent) parent.navigate('Health', { screen: 'HealthOverview' }); }}>
          <Ionicons name="sparkles-outline" size={20} color={Colors.primary} />
          <View style={s.flex}><Text style={s.aiPillTitle}>MEGO AI</Text><Text style={s.aiPillText}>想知道 {data.pet.name} 最近的狀況嗎？</Text></View>
          <Ionicons name="chevron-forward" size={18} color={Colors.subtext} />
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
function HomeSectionHeader({ title }: { title: string }) {
  return <Text style={s.shortcutHeading}>{title}</Text>;
}
function CareShortcuts({ onOpen }: { onOpen: (route: string) => void }) {
  const shortcuts = React.useMemo<[keyof typeof Ionicons.glyphMap, string, string][]>(() => [
    ['journal-outline', '日常', 'DailyLog'],
    ['alert-circle-outline', '記錄異常', 'AbnormalType'],
    ['scale-outline', '體重', 'WeightList'],
    ['notifications-outline', '提醒', 'ReminderList'],
  ], []);
  return <View><HomeSectionHeader title="今天想做什麼？" /><View style={s.shortcutRow}>{shortcuts.map(([icon, label, route]) => <CareShortcut key={route} icon={icon} label={label} route={route} onOpen={onOpen} />)}</View></View>;
}

const ManagementAction = React.memo(function ManagementAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} style={s.managementAction} onPress={onPress}><View style={s.managementIcon}><Ionicons name={icon} size={ACTION_ICON_SIZE} color={Colors.success} /></View><View style={s.actionLabelProtection}><Text style={s.managementLabel}>{label}</Text></View></TouchableOpacity>;
});

const CareShortcut = React.memo(function CareShortcut({ icon, label, route, onOpen }: { icon: keyof typeof Ionicons.glyphMap; label: string; route: string; onOpen: (route: string) => void }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const handlePress = React.useCallback(() => onOpen(route), [onOpen, route]);
  return <Animated.View style={[s.shortcutWrap, { transform: [{ scale }] }]}><TouchableOpacity accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={s.shortcut} onPress={handlePress} onPressIn={() => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}><View style={s.primaryIcon}><Ionicons name={icon} size={ACTION_ICON_SIZE} color={Colors.success} /></View><View style={s.actionLabelProtection}><Text style={s.shortcutLabel}>{label}</Text></View></TouchableOpacity></Animated.View>;
});

function Center({
  title,
  loading,
  action,
}: {
  title: string;
  loading?: boolean;
  action?: () => void;
}) {
  return (
    <View style={s.center}>
      {loading && <ActivityIndicator size="large" color={Colors.primary} />}
      <Text style={s.centerTitle}>{title}</Text>
      {action && (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="重新整理首頁資料" style={s.retry} onPress={action}>
          <Text style={s.retryText}>重新整理</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  headerSurface: { backgroundColor: 'rgba(255,250,242,0.28)', borderRadius: 22, padding: 4, marginBottom: 4 },
  globalSearch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,250,242,0.72)',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: HOME_HORIZONTAL_PADDING, paddingBottom: HOME_BOTTOM_CLEARANCE, zIndex: 1 },
  flex: { flex: 1 },
  brandMark: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  logo: { width: 30, height: 28, resizeMode: 'contain' },
  eyebrow: { color: Colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  pageTitle: { color: Colors.text, fontSize: 21, lineHeight: 25, fontWeight: '900', marginTop: 3, textShadowColor: 'rgba(255,250,242,0.72)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  pageSubtitle: { color: Colors.subtext, marginTop: 4, marginBottom: 18 },
  detailsToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginBottom: 8 },
  detailsToggleIcon: { color: Colors.primary, fontSize: 20, fontWeight: '900', marginRight: 6 },
  detailsToggleText: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
  shortcutHeading: { color: Colors.text, fontSize: 18, fontWeight: '800', textShadowColor: 'rgba(255,255,255,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  todayOverlay: { backgroundColor: 'rgba(255,250,242,0.88)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.62)', paddingVertical: 8, paddingHorizontal: 10, marginTop: 8, marginBottom: 6 },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overlayTitle: { color: Colors.text, fontSize: 16, fontWeight: '900' },
  todayStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  todayStatusText: { color: Colors.text, fontSize: 12, fontWeight: '700', flex: 1 },
  overlayHint: { color: Colors.subtext, fontSize: 11, marginTop: 3 },
  aiPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,250,242,0.84)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.62)', paddingVertical: 8, paddingHorizontal: 10, marginTop: SECTION_GAP + 8 },
  aiPillTitle: { color: Colors.text, fontWeight: '900' },
  aiPillText: { color: '#554B43', fontSize: 11, marginTop: 1 },
  shortcutRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: QUICK_ACTION_HEADER_GAP, marginBottom: 5, gap: 6 },
  shortcutWrap: { flex: 1, minWidth: 0 },
  shortcut: { width: '100%', minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: ACTION_LABEL_GAP },
  primaryIcon: { width: ACTION_DIAMETER, height: ACTION_DIAMETER, borderRadius: ACTION_DIAMETER / 2, backgroundColor: 'rgba(239,248,239,0.94)', borderWidth: 1, borderColor: 'rgba(95,146,116,0.30)', alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { color: Colors.text, fontSize: 11, fontWeight: '600' },
  actionLabelProtection: { backgroundColor: 'rgba(250,247,239,0.72)', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 2 },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
  },
  petRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  petSummary: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,250,242,0.62)', borderRadius: 14, paddingVertical: 3, paddingHorizontal: 8, marginTop: 8, marginBottom: 12, maxWidth: '74%', minHeight: 46 },
  avatarSmall: { width: 32, height: 32, borderRadius: 16 },
  avatarFallbackSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  petNameSmall: { fontSize: 16, fontWeight: '900', color: Colors.text },
  petSwitchCompact: { gap: 6, paddingBottom: 2 },
  managementHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SECTION_GAP + 10, marginBottom: 4 },
  managementRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, marginBottom: 2 },
  managementAction: { flex: 1, alignItems: 'center', gap: ACTION_LABEL_GAP },
  managementIcon: { width: ACTION_DIAMETER, height: ACTION_DIAMETER, borderRadius: ACTION_DIAMETER / 2, backgroundColor: 'rgba(239,248,239,0.94)', alignItems: 'center', justifyContent: 'center' },
  managementLabel: { color: Colors.text, fontSize: 11, fontWeight: '600' },
  avatar: { width: 68, height: 68, borderRadius: 34 },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petName: { fontSize: 23, fontWeight: '900', color: Colors.text },
  muted: { color: Colors.subtext, lineHeight: 20 },
  observationRow: { padding: 12, borderRadius: 12, backgroundColor: '#F5F7F4', marginBottom: 8 },
  observationTitle: { color: '#365E4A', fontWeight: '800', marginBottom: 4 },
  mutedSmall: { color: Colors.subtext, fontSize: 12, marginTop: 3 },
  link: { color: Colors.primary, fontWeight: '800', fontSize: 13 },
  petSwitch: { flexDirection: 'row', gap: 8, paddingTop: 14 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: Colors.text },
  chipText: { color: Colors.text },
  chipTextActive: { color: '#fff', fontWeight: '800' },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sectionHint: { color: Colors.subtext, fontSize: 12, marginBottom: 12 },
  metricRow: { flexDirection: 'row' },
  metric: { flex: 1, alignItems: 'center', paddingVertical: 5 },
  metricValue: { fontSize: 25, fontWeight: '900', color: Colors.text },
  good: { color: '#4E8A6C' },
  warn: { color: '#C17945' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  listIcon: { fontSize: 21, width: 35 },
  listTitle: { color: Colors.text, fontWeight: '700' },
  done: { textDecorationLine: 'line-through', color: Colors.subtext },
  doneLabel: { color: '#4E8A6C', fontWeight: '800', fontSize: 12 },
  smallButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  smallButtonText: { color: '#fff', fontWeight: '800' },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bigValue: { fontSize: 34, fontWeight: '900', color: Colors.text },
  unit: { fontSize: 15, color: Colors.subtext },
  weightDiff: { alignItems: 'flex-end' },
  previous: { fontSize: 12, color: Colors.subtext },
  change: { fontWeight: '900', marginTop: 6, color: Colors.text },
  up: { color: '#C36755' },
  down: { color: '#4E8A6C' },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7AB28D',
    marginRight: 12,
  },
  moderate: { backgroundColor: '#D39A51' },
  severe: { backgroundColor: '#CF6666' },
  arrow: { fontSize: 23, color: Colors.subtext },
  medicalReason: { fontSize: 19, fontWeight: '900', color: Colors.text, marginBottom: 10 },
  info: { flexDirection: 'row', paddingVertical: 5 },
  infoLabel: { width: 58, color: Colors.subtext, fontSize: 12 },
  infoValue: { flex: 1, color: Colors.text },
  disclaimer: { color: Colors.subtext, fontSize: 11, lineHeight: 17, marginTop: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '47%', backgroundColor: Colors.background, borderRadius: 14, padding: 14 },
  statValue: { fontSize: 24, fontWeight: '900', color: Colors.text },
  periods: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  period: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  periodActive: { backgroundColor: Colors.text },
  periodText: { color: Colors.text, fontWeight: '700' },
  periodTextActive: { color: '#fff' },
  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  empty: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { marginBottom: 6 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 28,
  },
  centerTitle: { color: Colors.subtext, textAlign: 'center', marginTop: 10 },
  retry: {
    backgroundColor: Colors.primary,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 16,
  },
  retryText: { color: '#fff', fontWeight: '800' },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 22,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 7,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { fontSize: 30, color: '#fff', lineHeight: 34 },
  fabMenu: { position: 'absolute', right: 22, bottom: 90, gap: 9, alignItems: 'flex-end' },
  fabAction: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  fabLabel: {
    backgroundColor: Colors.text,
    color: '#fff',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    fontWeight: '700',
  },
  fabMini: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
});
