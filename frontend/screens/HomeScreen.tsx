/** 用途：首頁健康儀表板，整合目前毛孩的摘要、統計、圖表、時間軸與快速新增。 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HealthEventPieChart from '../components/dashboard/HealthEventPieChart';
import WeightTrendChart from '../components/dashboard/WeightTrendChart';
import OrdinalTrendChart from '../components/dashboard/OrdinalTrendChart';
import { Colors } from '../constants/Colors';
import { HEALTH_EVENT_LABELS } from '../constants/HealthEvents';
import { openTimelineSource, TIMELINE_META } from '../constants/Timeline';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import { getHealthDashboard } from '../services/dashboardService';
import {
  cancelReminderNotifications,
  reconcileAccountNotifications,
} from '../services/notificationService';
import { completeReminder } from '../services/reminderService';
import { HealthDashboard, ReminderType } from '../types';

type Navigation = NativeStackNavigationProp<HomeStackParamList>;
type WeightPeriod = 7 | 30 | 90;
const REMINDER_ICONS: Record<ReminderType, string> = {
  vaccine: '💉',
  deworming_internal: '🛡️',
  deworming_external: '🛡️',
  heartworm: '❤️',
  medication: '💊',
  follow_up: '🩺',
  bath: '🛁',
  grooming: '✂️',
  restock: '📦',
  other: '⏰',
};
const GENDER_LABELS: Record<string, string> = { male: '公', female: '母', unknown: '未設定' };
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
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
  const [healthTrend, setHealthTrend] = useState<'water' | 'food' | 'stool' | 'energy'>('water');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<WeightPeriod>(30);
  const [fabOpen, setFabOpen] = useState(false);
  const petRef = useRef<string | null>(null);
  const load = useCallback(async () => {
    if (!session?.userId || !selectedPet) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const petId = selectedPet.id;
    if (petRef.current !== petId) {
      petRef.current = petId;
      setData(null);
      setLoading(true);
    }
    try {
      setError('');
      const result = await getHealthDashboard(session.userId, petId, period);
      if (petRef.current === petId) setData(result);
    } catch (e) {
      if (petRef.current === petId) setError((e as Error).message || '健康總覽載入失敗');
    } finally {
      if (petRef.current === petId) {
        setLoading(false);
        setRefreshing(false);
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
    setRefreshing(true);
    await Promise.all([refreshPets(), load()]);
  };
  const finish = async (id: string) => {
    if (!session?.userId) return;
    try {
      await completeReminder(session.userId, id);
      await cancelReminderNotifications(id).catch(() => undefined);
      await reconcileAccountNotifications(session.userId, pets).catch(() => undefined);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const trend = useMemo(() => {
    const cutoff = Date.now() - period * 86400000;
    return data?.weight.trend.filter((item) => new Date(item.measuredAt).getTime() >= cutoff) ?? [];
  }, [data?.weight.trend, period]);
  const openDailyLog = () => {
    setFabOpen(false);
    navigation.navigate('DailyLog');
  };
  const go = (route: 'WeightForm' | 'AbnormalType' | 'MedicalVisitForm' | 'CreateReminder') => {
    setFabOpen(false);
    if (route === 'WeightForm') navigation.navigate(route, {});
    else if (route === 'MedicalVisitForm') navigation.navigate(route, {});
    else if (route === 'CreateReminder') navigation.navigate(route, undefined);
    else navigation.navigate(route);
  };
  if (petLoading || loading) return <Center loading title="正在整理健康總覽…" />;
  if (petError || error || !selectedPet || !data)
    return <Center title={petError || error || '尚無毛孩資料'} action={refresh} />;
  const weight = data.weight;
  const diff = weight.differenceKg;
  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={s.titleRow}>
          <View style={s.flex}>
            <Text style={s.eyebrow}>PAWLOG HEALTH</Text>
            <Text style={s.pageTitle}>健康總覽</Text>
            <Text style={s.pageSubtitle}>今天的照護重點，一眼看完。</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="全域搜尋"
            style={s.globalSearch}
            onPress={() => navigation.navigate('GlobalSearch')}
          >
            <Text style={s.globalSearchIcon}>⌕</Text>
          </TouchableOpacity>
        </View>

        <Card>
          <View style={s.petRow}>
            {data.pet.avatarUrl ? (
              <Image source={{ uri: data.pet.avatarUrl }} style={s.avatar} />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarEmoji}>🐶</Text>
              </View>
            )}
            <View style={s.flex}>
              <Text style={s.petName}>{data.pet.name}</Text>
              <Text style={s.muted}>
                {data.pet.breed || '品種未設定'} ·{' '}
                {GENDER_LABELS[data.pet.gender] || data.pet.gender || '性別未設定'} ·{' '}
                {calculateAge(data.pet.birthDate)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('EditPet')}>
              <Text style={s.link}>編輯</Text>
            </TouchableOpacity>
          </View>
          {pets.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.petSwitch}>
                {pets.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[s.chip, p.id === selectedPet.id && s.chipActive]}
                    onPress={() => selectPet(p.id)}
                  >
                    <Text style={[s.chipText, p.id === selectedPet.id && s.chipTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </Card>

        <Section
          title="今日提醒"
          action="查看全部"
          onAction={() => navigation.navigate('ReminderList')}
        >
          <View style={s.metricRow}>
            <Metric value={data.todayReminders.total} label="今日" />
            <Metric value={data.todayReminders.completed} label="完成" tone="good" />
            <Metric value={data.todayReminders.pending} label="未完成" tone="warn" />
          </View>
          {!data.todayReminders.items.length ? (
            <Empty text="今天沒有待辦事項" />
          ) : (
            data.todayReminders.items.map((item) => (
              <View key={item.id} style={s.listRow}>
                <Text style={s.listIcon}>{REMINDER_ICONS[item.type]}</Text>
                <View style={s.flex}>
                  <Text style={[s.listTitle, item.status === 'completed' && s.done]}>
                    {item.title}
                  </Text>
                  <Text style={s.mutedSmall}>
                    {new Date(item.scheduledAt).toLocaleTimeString('zh-TW', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                {item.status === 'completed' ? (
                  <Text style={s.doneLabel}>已完成</Text>
                ) : (
                  <TouchableOpacity style={s.smallButton} onPress={() => finish(item.id)}>
                    <Text style={s.smallButtonText}>完成</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </Section>

        <Section
          title="最近體重"
          onAction={() => navigation.navigate('WeightList')}
          action="查看紀錄"
        >
          {!weight.latest ? (
            <Empty text="尚未記錄體重" />
          ) : (
            <>
              <View style={s.weightRow}>
                <View>
                  <Text style={s.bigValue}>
                    {weight.latest.weightKg} <Text style={s.unit}>kg</Text>
                  </Text>
                  <Text style={s.mutedSmall}>{formatDate(weight.latest.measuredAt)} 測量</Text>
                </View>
                <View style={s.weightDiff}>
                  {weight.previous && (
                    <Text style={s.previous}>上一筆 {weight.previous.weightKg} kg</Text>
                  )}
                  <Text
                    style={[
                      s.change,
                      weight.change === 'increased' && s.up,
                      weight.change === 'decreased' && s.down,
                    ]}
                  >
                    {diff == null
                      ? '尚無前次資料'
                      : weight.change === 'unchanged'
                        ? '維持不變'
                        : `${weight.change === 'increased' ? '↑ 增加' : '↓ 減少'} ${Math.abs(diff)} kg`}
                  </Text>
                </View>
              </View>
            </>
          )}
        </Section>

        <Section
          title="最近健康事件"
          action="全部紀錄"
          onAction={() => navigation.navigate('HealthEventList')}
        >
          {!data.recentHealthEvents.length ? (
            <Empty text="目前沒有健康異常紀錄" />
          ) : (
            data.recentHealthEvents.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={s.listRow}
                onPress={() => navigation.navigate('HealthEventDetail', { eventId: item.id })}
              >
                <View
                  style={[
                    s.severityDot,
                    item.severity === 'severe' && s.severe,
                    item.severity === 'moderate' && s.moderate,
                  ]}
                />
                <View style={s.flex}>
                  <Text style={s.listTitle}>{item.summary}</Text>
                  <Text style={s.mutedSmall}>
                    {HEALTH_EVENT_LABELS[item.type]} · {formatDate(item.occurredAt)}
                  </Text>
                </View>
                <Text style={s.arrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </Section>

        <Section
          title="目前用藥"
          action="查看全部"
          onAction={() => navigation.navigate('MedicationList')}
        >
          {!data.currentMedications.length ? (
            <Empty text="目前沒有服用中的藥物" />
          ) : (
            data.currentMedications.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={s.listRow}
                onPress={() => navigation.navigate('MedicationDetail', { recordId: item.id })}
              >
                <Text style={s.listIcon}>💊</Text>
                <View style={s.flex}>
                  <Text style={s.listTitle}>{item.name}</Text>
                  <Text style={s.mutedSmall}>
                    {item.endDate ? `至 ${item.endDate}` : '長期使用'}
                  </Text>
                </View>
                <Text style={s.arrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </Section>

        <Section
          title="最近疫苗"
          action="查看全部"
          onAction={() => navigation.navigate('VaccinationList')}
        >
          {!data.recentVaccination ? (
            <Empty text="目前沒有疫苗紀錄" />
          ) : (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('VaccinationDetail', { recordId: data.recentVaccination!.id })
              }
            >
              <Text style={s.medicalReason}>{data.recentVaccination.vaccineName}</Text>
              <Info
                label="日期"
                value={new Date(data.recentVaccination.administeredAt).toLocaleDateString('zh-TW')}
              />
              <Info label="醫院" value={data.recentVaccination.hospitalName || '未填寫醫院'} />
              {data.recentVaccination.nextDueAt ? (
                <Info
                  label="下次"
                  value={new Date(data.recentVaccination.nextDueAt).toLocaleDateString('zh-TW')}
                />
              ) : null}
            </TouchableOpacity>
          )}
        </Section>

        <Section
          title="最近就醫"
          action="全部紀錄"
          onAction={() => navigation.navigate('MedicalVisitList')}
        >
          {!data.recentMedicalVisit ? (
            <Empty text="目前沒有就醫紀錄" />
          ) : (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('MedicalVisitDetail', { visitId: data.recentMedicalVisit!.id })
              }
            >
              <Text style={s.medicalReason}>{data.recentMedicalVisit.reason}</Text>
              <Info
                label="日期"
                value={new Date(data.recentMedicalVisit.visitedAt).toLocaleDateString('zh-TW')}
              />
              <Info label="醫院" value={data.recentMedicalVisit.clinicName || '未填寫醫院'} />
              <Info label="醫師" value={data.recentMedicalVisit.veterinarianName || '未填寫醫師'} />
              <Text style={s.disclaimer}>顯示飼主保存的看診原因，不是醫療診斷。</Text>
            </TouchableOpacity>
          )}
        </Section>

        <Section title="近 30 天健康統計">
          <View style={s.statsGrid}>
            <Stat value={data.statistics30Days.healthEventCount} label="健康事件" />
            <Stat value={data.statistics30Days.medicalVisitCount} label="就醫次數" />
            <Stat value={data.statistics30Days.reminderCount} label="提醒數" />
            <Stat value={`${data.statistics30Days.reminderCompletionRate}%`} label="完成率" />
          </View>
        </Section>

        <Section
          title="今日健康紀錄"
          action="快速記錄"
          onAction={() => navigation.navigate('DailyLog')}
        >
          {!data.todayDailyLog ? (
            <Empty text="今天還沒有日常紀錄" />
          ) : (
            <View>
              <Text style={s.muted}>喝水：{data.todayDailyLog.waterLevel || '未記錄'}</Text>
              <Text style={s.muted}>食量：{data.todayDailyLog.foodLevel || '未記錄'}</Text>
              <Text style={s.muted}>精神：{data.todayDailyLog.energyLevel || '未記錄'}</Text>
              <Text style={s.muted}>便便：{data.todayDailyLog.stoolLevel ?? '未記錄'}</Text>
            </View>
          )}
        </Section>

        <Section title="日常健康趨勢">
          <View style={s.periods}>
            {([7, 30, 90] as WeightPeriod[]).map((value) => (
              <TouchableOpacity
                key={value}
                style={[s.period, period === value && s.periodActive]}
                onPress={() => setPeriod(value)}
              >
                <Text style={[s.periodText, period === value && s.periodTextActive]}>
                  {value} 天
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.periods}>
            {(
              [
                ['water', '喝水'],
                ['food', '食量'],
                ['stool', '便便'],
                ['energy', '精神'],
              ] as const
            ).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[s.period, healthTrend === key && s.periodActive]}
                onPress={() => setHealthTrend(key)}
              >
                <Text style={[s.periodText, healthTrend === key && s.periodTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {healthTrend === 'water' ? (
            <OrdinalTrendChart
              items={data.dailyLogTrends.water}
              field="waterLevel"
              labels={{
                very_low: '很少',
                low: '偏少',
                normal: '正常',
                high: '偏多',
                very_high: '很多',
              }}
            />
          ) : healthTrend === 'food' ? (
            <OrdinalTrendChart
              items={data.dailyLogTrends.food}
              field="foodLevel"
              labels={{
                very_low: '很少',
                low: '偏少',
                normal: '正常',
                high: '偏多',
                very_high: '很多',
              }}
            />
          ) : healthTrend === 'stool' ? (
            <>
              <OrdinalTrendChart
                items={data.dailyLogTrends.stool}
                field="stoolLevel"
                labels={{ '1': '很硬', '2': '偏硬', '3': '正常', '4': '偏軟', '5': '水狀' }}
              />
              <Text style={s.sectionHint}>此尺度表示便便型態，不代表健康分數。</Text>
            </>
          ) : (
            <EnergySummary counts={data.energySummary.counts} total={data.energySummary.total} />
          )}
        </Section>

        <Section
          title="體重趨勢"
          action="完整趨勢"
          onAction={() => navigation.navigate('WeightList')}
        >
          <View style={s.periods}>
            {([7, 30, 90] as WeightPeriod[]).map((value) => (
              <TouchableOpacity
                key={value}
                style={[s.period, period === value && s.periodActive]}
                onPress={() => setPeriod(value)}
              >
                <Text style={[s.periodText, period === value && s.periodTextActive]}>
                  {value} 天
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <WeightTrendChart items={trend} />
        </Section>

        <Section title="健康事件統計">
          <Text style={s.sectionHint}>最近 30 天，依紀錄類型分類</Text>
          <HealthEventPieChart data={data.healthEventCategories30Days} />
        </Section>

        <Section
          title="近期時間軸"
          action="查看全部"
          onAction={() => navigation.getParent()?.navigate('Timeline' as never)}
        >
          {!data.timeline.length ? (
            <Empty text="目前還沒有近期紀錄" />
          ) : (
            data.timeline.map((item) => {
              const meta = TIMELINE_META[item.type];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={s.listRow}
                  onPress={() => openTimelineSource(navigation, item)}
                >
                  <View style={s.timelineIcon}>
                    <Text>{meta.icon}</Text>
                  </View>
                  <View style={s.flex}>
                    <Text style={s.listTitle}>{item.title}</Text>
                    <Text style={s.mutedSmall}>
                      {formatDate(item.occurredAt)}
                      {item.attachmentCount > 0 ? ` · 📷 ${item.attachmentCount} 張` : ''}
                    </Text>
                  </View>
                  <Text style={s.arrow}>›</Text>
                </TouchableOpacity>
              );
            })
          )}
        </Section>
      </ScrollView>
      {fabOpen && (
        <View style={s.fabMenu}>
          <FabAction
            label="用藥管理"
            icon="💊"
            onPress={() => {
              setFabOpen(false);
              navigation.navigate('MedicationList');
            }}
          />
          <FabAction
            label="驅蟲紀錄"
            icon="🛡️"
            onPress={() => {
              setFabOpen(false);
              navigation.navigate('DewormingList');
            }}
          />
          <FabAction
            label="疫苗紀錄"
            icon="💉"
            onPress={() => {
              setFabOpen(false);
              navigation.navigate('VaccinationList');
            }}
          />
          <FabAction label="今日紀錄" icon="📝" onPress={openDailyLog} />
          <FabAction label="新增提醒" icon="⏰" onPress={() => go('CreateReminder')} />
          <FabAction label="新增就醫" icon="🏥" onPress={() => go('MedicalVisitForm')} />
          <FabAction label="記錄異常" icon="⚠️" onPress={() => go('AbnormalType')} />
          <FabAction label="更新體重" icon="⚖️" onPress={() => go('WeightForm')} />
        </View>
      )}
      <TouchableOpacity
        accessibilityLabel={fabOpen ? '關閉快速新增' : '快速新增'}
        style={s.fab}
        onPress={() => setFabOpen((v) => !v)}
      >
        <Text style={s.fabText}>{fabOpen ? '×' : '＋'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
function EnergySummary({ counts, total }: { counts: Record<string, number>; total: number }) {
  if (!total) return <Text style={s.empty}>此期間尚無精神紀錄</Text>;
  const labels: Record<string, string> = {
    very_energetic: '很有精神',
    normal: '正常',
    slightly_low: '稍微沒精神',
    clearly_low: '明顯沒精神',
    very_low: '很差',
  };
  return (
    <View>
      {Object.entries(counts).map(([k, v]) => (
        <Text key={k} style={s.muted}>
          {labels[k] || k}：{v} 次
        </Text>
      ))}
    </View>
  );
}
function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
function Section({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>{title}</Text>
        {action && (
          <TouchableOpacity onPress={onAction}>
            <Text style={s.link}>{action}</Text>
          </TouchableOpacity>
        )}
      </View>
      <Card>{children}</Card>
    </View>
  );
}
function Metric({ value, label, tone }: { value: number; label: string; tone?: 'good' | 'warn' }) {
  return (
    <View style={s.metric}>
      <Text style={[s.metricValue, tone === 'good' && s.good, tone === 'warn' && s.warn]}>
        {value}
      </Text>
      <Text style={s.mutedSmall}>{label}</Text>
    </View>
  );
}
function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.mutedSmall}>{label}</Text>
    </View>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.info}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyIcon}>🐾</Text>
      <Text style={s.muted}>{text}</Text>
    </View>
  );
}
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
        <TouchableOpacity style={s.retry} onPress={action}>
          <Text style={s.retryText}>重新整理</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
function FabAction({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.fabAction} onPress={onPress}>
      <Text style={s.fabLabel}>{label}</Text>
      <View style={s.fabMini}>
        <Text>{icon}</Text>
      </View>
    </TouchableOpacity>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  globalSearch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globalSearchIcon: { fontSize: 29, color: Colors.text },
  content: { padding: 18, paddingBottom: 115 },
  flex: { flex: 1 },
  eyebrow: { color: Colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  pageTitle: { color: Colors.text, fontSize: 30, fontWeight: '900', marginTop: 4 },
  pageSubtitle: { color: Colors.subtext, marginTop: 4, marginBottom: 18 },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
  },
  petRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { width: 68, height: 68, borderRadius: 34 },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 34 },
  petName: { fontSize: 23, fontWeight: '900', color: Colors.text },
  muted: { color: Colors.subtext, lineHeight: 20 },
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
    marginTop: 23,
    marginBottom: 9,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
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
  emptyIcon: { fontSize: 25, marginBottom: 6 },
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
