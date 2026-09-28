/** 用途：首頁照護入口、今日待辦與近期健康觀察。 */
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/Colors';
import { HOME_THEMES } from '../constants/HomeThemes';
import { HomeBackgroundScene } from '../components/home/HomeBackgroundScene';
import { SoftButton, SoftEntrance } from '../components/SoftMotion';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import { getHealthDashboard } from '../services/dashboardService';
import { getTodayReminders } from '../services/reminderService';
import { reconcileAccountNotifications } from '../services/notificationService';
import { analyzeHealthTrend, HealthTrendResult } from '../utils/healthTrendEngine';
import { HomeAction } from '../features/home/components/HomeAction';
import { HomeTodayOverview } from '../features/home/components/HomeTodayOverview';
import { CARE_ACTIONS, DAILY_ACTIONS } from '../features/home/homeContent';
import { HomePetHeader } from '../features/home/components/HomePetHeader';
import { HomePetSelectorModal } from '../features/home/components/HomePetSelectorModal';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';

type Navigation = NativeStackNavigationProp<HomeStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const { height } = useWindowDimensions();
  const homeDockPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const { settings } = useSettings();
  const activeHomeTheme = HOME_THEMES[settings.homeTheme];
  const {
    pets,
    selectedPet,
    selectPet,
    refreshPets,
    isLoading: petLoading,
    error: petError,
  } = usePet();
  const [healthTrend, setHealthTrend] = useState<HealthTrendResult | null>(null);
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resultOwner, setResultOwner] = useState('');
  const [petSelectorVisible, setPetSelectorVisible] = useState(false);
  const requestRef = useRef(0);
  const ownerRef = useRef('');
  const loadedOwnerRef = useRef('');
  const ownerKey = session && selectedPet ? `${session.userId}:${selectedPet.id}` : '';
  const petId = selectedPet?.id;

  const load = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestRef.current === requestId;
    if (!session?.userId || !petId) {
      setLoading(false);
      return;
    }
    if (ownerRef.current !== ownerKey) {
      ownerRef.current = ownerKey;
      setTodayCount(null);
      setHealthTrend(null);
      setResultOwner(ownerKey);
    }
    if (loadedOwnerRef.current !== ownerKey) setLoading(true);
    setError('');
    // 今日提醒與健康摘要互不相依，並行載入可縮短首頁整體等待時間。
    void getTodayReminders(session.userId, petId, signal)
      .then((reminders) => {
        if (isCurrent())
          setTodayCount(
            reminders.filter((item) => item.status === 'pending' || item.status === 'snoozed')
              .length,
          );
      })
      .catch(() => {
        if (isCurrent()) setError('部分照護資料更新失敗');
      });
    try {
      const dashboard = await getHealthDashboard(session.userId, petId, 30, signal);
      if (!isCurrent()) return;
      setHealthTrend(analyzeHealthTrend(dashboard.dailyRecords));
      loadedOwnerRef.current = ownerKey;
      setLoading(false);
    } catch {
      if (isCurrent()) {
        setError('照護資料更新失敗');
        setLoading(false);
      }
    }
  }, [session?.userId, petId, ownerKey]);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void load(controller.signal);
      if (session?.userId)
        reconcileAccountNotifications(session.userId, pets).catch(() => undefined);
      return () => {
        controller.abort();
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
      switch (route) {
        case 'DailyLog':
          navigation.navigate('DailyLog', { quickEntry: true });
          break;
        case 'AbnormalType':
          navigation.navigate('AbnormalType', { quickEntry: true });
          break;
        case 'WeightForm':
          navigation.navigate('WeightForm', { quickEntry: true });
          break;
        case 'CreateReminder':
          navigation.navigate('CreateReminder', { quickEntry: true });
          break;
        case 'VaccinationForm':
          navigation.navigate('VaccinationForm', { quickEntry: true });
          break;
        case 'DewormingForm':
          navigation.navigate('DewormingForm', { quickEntry: true });
          break;
        case 'MedicationForm':
          navigation.navigate('MedicationForm', { quickEntry: true });
          break;
        case 'MedicalVisitForm':
          navigation.navigate('MedicalVisitForm', { quickEntry: true });
          break;
        default:
          navigation.navigate(route as never);
      }
    },
    [navigation],
  );
  const ready = resultOwner === ownerKey;
  const reminders = ready ? todayCount : null;
  const observations = ready ? healthTrend : null;
  // Most standard iPhones fall below this threshold; the tighter composition
  // keeps the home shortcuts and overview clear of the floating tab dock.
  const compact = height < 900;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.container}>
      <StatusBar style="dark" />
      <HomeBackgroundScene themeId={settings.homeTheme} />
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
            {
              paddingTop: compact ? 16 : Math.max(48, Math.min(Math.round(height * 0.05), 72)),
              paddingBottom: homeDockPadding,
            },
          ]}
        >
          <HomePetHeader
            selectedPet={selectedPet}
            pets={pets}
            theme={activeHomeTheme}
            compact={compact}
            onEdit={() => navigation.navigate('EditPet')}
            onOpenPetSelector={() => setPetSelectorVisible(true)}
          />
          <Text style={[s.shortcutHeading, compact && s.compactHeading]}>今天想做什麼？</Text>
          <View style={[s.shortcutRow, compact && s.compactGap]}>
            {DAILY_ACTIONS.map(([icon, label, route]) => (
              <HomeAction
                key={route}
                icon={icon}
                label={label}
                route={route}
                onOpen={openRoute}
                variant="daily"
                compact={compact}
              />
            ))}
          </View>
          <HomeTodayOverview
            compact={compact}
            loading={loading}
            error={error}
            reminders={reminders}
            observations={observations}
            onRetry={refresh}
            onOpenReminders={() =>
              navigation.getParent()?.navigate('Timeline', {
                screen: 'ReminderList',
                params: { upcomingDays: 0 },
              })
            }
            onOpenObservations={() =>
              navigation.getParent()?.navigate('Timeline', { screen: 'HealthObservation' })
            }
          />
          <Text
            style={[
              s.shortcutHeading,
              compact && s.compactHeading,
              s.managementHead,
              compact && s.compactGap,
            ]}
          >
            健康管理
          </Text>
          <View style={s.managementRow}>
            {CARE_ACTIONS.map(([icon, label, route]) => (
              <HomeAction
                key={route}
                icon={icon}
                label={label}
                route={route}
                onOpen={openRoute}
                variant="care"
                compact={compact}
              />
            ))}
          </View>
        </SoftEntrance>
      )}
      {petSelectorVisible && selectedPet ? (
        <HomePetSelectorModal
          visible
          pets={pets}
          selectedPet={selectedPet}
          onSelect={selectPet}
          onClose={() => setPetSelectorVisible(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: 16, zIndex: 1 },
  flex: { flex: 1, minWidth: 0 },
  mutedSmall: { color: Colors.subtext, fontSize: 12, marginTop: 3 },
  shortcutHeading: {
    color: Colors.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    textShadowColor: 'rgba(255,255,255,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  compactHeading: { fontSize: 19, lineHeight: 25 },
  shortcutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
    marginTop: 10,
    marginBottom: 5,
  },
  managementHead: { marginTop: 17, marginBottom: 1 },
  managementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
    marginTop: 8,
    marginBottom: 2,
  },
  compactGap: { marginTop: 9 },
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
