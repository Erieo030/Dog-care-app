/** 用途：呈現由日常紀錄推算出的近期健康趨勢，不混入健康異常事件。 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/Colors';
import { SoftEntrance } from '../components/SoftMotion';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { useSettings } from '../contexts/SettingsContext';
import { getHealthDashboard } from '../services/dashboardService';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import {
  analyzeHealthTrend,
  getHealthObservationText,
  HealthTrendAlert,
  HealthTrendResult,
} from '../utils/healthTrendEngine';

const CATEGORY_ICONS: Record<HealthTrendAlert['category'], keyof typeof Ionicons.glyphMap> = {
  water: 'water-outline',
  food: 'restaurant-outline',
  energy: 'battery-half-outline',
  stool: 'analytics-outline',
};
const OBSERVATION_ARTWORKS = {
  'morning-home': require('../assets/artwork/themes/morning-home/page-decorations/observation-stable-v1.webp'),
  'afternoon-living-room': require('../assets/artwork/themes/afternoon-living-room/page-decorations/observation-stable-v1.webp'),
  'garden-walk': require('../assets/artwork/themes/garden-walk/page-decorations/observation-stable-v1.webp'),
};

export default function HealthObservationScreen() {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const { settings } = useSettings();
  const [result, setResult] = useState<HealthTrendResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestRef.current;
    if (!session?.userId || !selectedPet?.id) {
      setResult(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError('');
      const dashboard = await getHealthDashboard(session.userId, selectedPet.id, 30, signal);
      if (requestId !== requestRef.current) return;
      setResult(analyzeHealthTrend(dashboard.dailyRecords || []));
    } catch (requestError) {
      if (requestId !== requestRef.current) return;
      setError((requestError as Error).message || '暫時無法載入健康觀察');
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedPet?.id, session?.userId]);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      setLoading(true);
      void load(controller.signal);
      return () => {
        controller.abort();
        requestRef.current += 1;
      };
    }, [load]),
  );

  const refresh = () => {
    setRefreshing(true);
    void load();
  };
  const alerts = result?.alerts || [];
  const continuedAlerts = alerts.filter((alert) => alert.level === 'continued');
  const watchAlerts = alerts.filter((alert) => alert.level === 'watch');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="heart-outline" size={24} color={Colors.success} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.heading}>
              {result ? getHealthObservationText(result) : '正在整理日常紀錄'}
            </Text>
            <Text style={styles.subheading}>依最近 30 天的喝水、食量、精神與便便紀錄整理。</Text>
          </View>
        </View>

        {loading && !result ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.muted}>正在整理健康觀察…</Text>
          </View>
        ) : error ? (
          <View style={styles.loadingBox}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={refresh}>
              <Text style={styles.retryText}>重新載入</Text>
            </TouchableOpacity>
          </View>
        ) : alerts.length === 0 ? (
          <View style={styles.stableBox}>
            <SoftEntrance>
              <Image
                accessible={false}
                resizeMode="contain"
                source={OBSERVATION_ARTWORKS[settings.homeTheme]}
                style={styles.stableArtwork}
              />
            </SoftEntrance>
            <Ionicons name="leaf-outline" size={30} color={Colors.success} />
            <Text style={styles.stableTitle}>今天狀況穩定</Text>
            <Text style={styles.muted}>目前沒有持續出現、需要特別留意的日常變化。</Text>
          </View>
        ) : (
          <>
            {continuedAlerts.length > 0 && (
              <ObservationSection title="持續需要留意" alerts={continuedAlerts} />
            )}
            {watchAlerts.length > 0 && (
              <ObservationSection title="近期需要留意" alerts={watchAlerts} />
            )}
          </>
        )}

        <Text style={styles.disclaimer}>
          這是日常趨勢提醒，不是疾病診斷；若你仍感到擔心，建議諮詢獸醫。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ObservationSection({ title, alerts }: { title: string; alerts: HealthTrendAlert[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {alerts.map((alert) => (
        <View key={`${alert.category}-${alert.status}`} style={styles.card}>
          <View style={[styles.cardIcon, alert.level === 'continued' && styles.cardIconContinued]}>
            <Ionicons name={CATEGORY_ICONS[alert.category]} size={23} color={Colors.success} />
          </View>
          <View style={styles.flex}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>{alert.title}</Text>
              <Text style={[styles.days, alert.level === 'continued' && styles.daysContinued]}>
                已連續 {alert.consecutiveDays} 天
              </Text>
            </View>
            <Text style={styles.message}>{alert.message}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, padding: 20, paddingBottom: 42 },
  flex: { flex: 1, minWidth: 0 },
  intro: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  heading: { color: Colors.text, fontSize: 19, fontWeight: '800' },
  subheading: { color: Colors.subtext, fontSize: 13, lineHeight: 19, marginTop: 4 },
  loadingBox: { alignItems: 'center', paddingVertical: 52, gap: 12 },
  stableBox: {
    alignItems: 'center',
    paddingVertical: 42,
    paddingHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(231,242,234,0.62)',
  },
  stableTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', marginTop: 10 },
  stableArtwork: { width: 72, height: 72, marginBottom: 2 },
  muted: { color: Colors.subtext, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  section: { marginTop: 24 },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', marginBottom: 10 },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 15,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  cardIconContinued: { backgroundColor: 'rgba(242,225,210,0.92)' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: Colors.text, fontSize: 17, fontWeight: '800', flex: 1 },
  days: { color: Colors.success, fontSize: 12, fontWeight: '700' },
  daysContinued: { color: Colors.primary },
  message: { color: Colors.subtext, fontSize: 14, lineHeight: 21, marginTop: 6 },
  disclaimer: {
    color: Colors.subtext,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 28,
    textAlign: 'center',
  },
  error: { color: Colors.danger, textAlign: 'center' },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 14,
  },
  retryText: { color: Colors.primary, fontWeight: '700' },
});
