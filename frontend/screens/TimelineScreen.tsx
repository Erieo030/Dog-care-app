/** 用途：顯示可篩選、分頁並可進入來源詳細頁的完整毛孩時間軸。 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../constants/Colors';
import ScreenState from '../components/ScreenState';
import { openTimelineSource, TIMELINE_META } from '../constants/Timeline';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import { getTimelinePage } from '../services/timelineService';
import { TimelineItem, TimelineType } from '../types';
type Props = NativeStackScreenProps<HomeStackParamList, 'TimelineOverview'>;
type Filter = 'all' | Exclude<TimelineType, 'life_event'>;
const FILTERS: Array<[Filter, string]> = [
  ['all', '全部'],
  ['reminder_completed', '提醒'],
  ['health_event', '健康異常'],
  ['weight', '體重'],
];
const PAGE_SIZE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
export default function TimelineScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterChanging, setFilterChanging] = useState(false);
  const [error, setError] = useState('');
  const [moreError, setMoreError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [nextSkip, setNextSkip] = useState(0);
  const requestId = useRef(0);
  const hasLoaded = useRef(false);
  const lastPetId = useRef<string | null>(null);
  const load = useCallback(
    async (reset = true, nextFilter: Filter = filter) => {
      if (!selectedPet || !session?.userId) {
        setItems([]);
        setLoading(false);
        setRefreshing(false);
        setFilterChanging(false);
        return;
      }
      if (!reset && loadingMore) return;
      const current = ++requestId.current;
      if (!reset) setLoadingMore(true);
      try {
        if (reset) setError('');
        else setMoreError('');
        const page = await getTimelinePage(session.userId, selectedPet.id, {
          limit: PAGE_SIZE,
          skip: reset ? 0 : nextSkip,
          type: nextFilter === 'all' ? undefined : nextFilter,
        });
        if (current !== requestId.current) return;
        const now = Date.now();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const rangeStart = nextFilter === 'all' || nextFilter === 'reminder_completed'
          ? todayStart.getTime()
          : todayStart.getTime() - 6 * DAY_MS;
        const filteredItems = page.items
          .filter((item) => {
            const timestamp = new Date(item.occurredAt).getTime();
            return Number.isFinite(timestamp) && timestamp >= rangeStart && (
              nextFilter === 'all' || nextFilter === 'reminder_completed' || timestamp <= now
            );
          })
          .sort((left, right) => {
            const direction = nextFilter === 'all' || nextFilter === 'reminder_completed' ? 1 : -1;
            return direction * (new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime());
          });
        setItems((previous) =>
          reset
            ? filteredItems
            : [...previous, ...filteredItems.filter((item) => !previous.some((old) => old.id === item.id))],
        );
        setHasMore(false);
        setNextSkip(page.nextSkip);
      } catch (e) {
        if (current !== requestId.current) return;
        const message = (e as Error).message || '無法載入時間軸';
        if (reset) setError(message);
        else setMoreError(message);
      } finally {
        if (current === requestId.current) {
          setLoading(false);
          hasLoaded.current = true;
          setRefreshing(false);
          setLoadingMore(false);
          setFilterChanging(false);
        }
      }
    },
    [filter, loadingMore, nextSkip, selectedPet, session?.userId],
  );
  // 載入函式會隨分頁狀態更新；聚焦效果只應在毛孩或篩選改變時重設，避免畫面反覆閃爍。
  const loadRef = useRef(load);
  loadRef.current = load;
  useFocusEffect(
    useCallback(() => {
      if (!selectedPet?.id || !session?.userId) return;
      const petChanged = lastPetId.current !== selectedPet.id;
      const firstLoad = !hasLoaded.current;
      lastPetId.current = selectedPet.id;
      if (petChanged || firstLoad) {
        setItems([]);
        setLoading(true);
      }
      setNextSkip(0);
      loadRef.current(true, filter);
    }, [filter, selectedPet?.id, session?.userId]),
  );
  const changeFilter = (value: Filter) => {
    if (value === filter || filterChanging) return;
    setFilterChanging(true);
    setFilter(value);
  };
  if (loading) return <ScreenState loading text="正在載入時間軸…" />;
  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={filterChanging || error ? [] : items}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setNextSkip(0); load(true, filter); }} />}
        ListHeaderComponent={<>
          <View style={s.petHeader}>
            {selectedPet?.avatarUrl ? <Image source={{ uri: selectedPet.avatarUrl }} style={s.petAvatar} /> : <View style={s.petAvatarFallback}><Ionicons name="paw-outline" size={21} color={Colors.primary} /></View>}
            <View style={s.flex}><Text style={s.eyebrow}>照護紀錄</Text><Text style={s.title}>{selectedPet?.name} 的生活足跡</Text></View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
            {FILTERS.map(([value, label]) => <TouchableOpacity key={value} disabled={filterChanging} style={[s.filter, filter === value && s.filterActive]} onPress={() => changeFilter(value)}><Text style={[s.filterText, filter === value && s.filterTextActive]}>{label}</Text></TouchableOpacity>)}
          </ScrollView>
          {filterChanging && <View style={s.inline}><ActivityIndicator color={Colors.primary} /><Text style={s.stateText}>切換篩選中…</Text></View>}
          {!!error && <Center text={error} action={() => { setLoading(true); load(true, filter); }} />}
        </>}
        ListEmptyComponent={!error && !filterChanging ? <View style={s.emptyBox}><View style={s.emptyIcon}><Ionicons name="paw-outline" size={28} color={Colors.primary} /></View><Text style={s.empty}>{filter === 'all' ? '目前還沒有時間軸紀錄' : '此類型目前沒有紀錄'}</Text><Text style={s.emptyHint}>每一次小小的照顧，都會慢慢留下足跡。</Text></View> : null}
        renderItem={({ item }) => <TimelineCard item={item} onPress={() => openTimelineSource(navigation, item)} />}
        ListFooterComponent={<>
          {!!moreError && <View style={s.moreState}><Text style={s.error}>{moreError}</Text><TouchableOpacity onPress={() => load(false, filter)}><Text style={s.retryText}>重試載入更多</Text></TouchableOpacity></View>}
          {hasMore && <TouchableOpacity disabled={loadingMore} style={[s.more, loadingMore && s.disabled]} onPress={() => load(false, filter)}>{loadingMore ? <ActivityIndicator color={Colors.primary} /> : <Text style={s.moreText}>載入更多</Text>}</TouchableOpacity>}
        </>}
      />
    </SafeAreaView>
  );
}
const TimelineCard = React.memo(function TimelineCard({ item, onPress }: { item: TimelineItem; onPress: () => void }) {
  const meta = TIMELINE_META[item.type] ?? TIMELINE_META.life_event;
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`查看紀錄：${meta.label}`} style={s.card} onPress={onPress}>
      <View style={s.icon}>
        <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={19} color={Colors.success} />
      </View>
      <View style={s.flex}>
        <View style={s.cardMeta}>
          <Text style={s.kind}>{meta.label}</Text>
          <Text style={s.date}>{new Date(item.occurredAt).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <Text style={s.itemTitle}>{item.title}</Text>
        {!!item.description && <Text style={s.description}>{item.description}</Text>}
        {item.attachmentCount > 0 && (
          <Text style={s.description}>照片 {item.attachmentCount} 張</Text>
        )}
      </View>
      <Text style={s.arrow}>›</Text>
    </TouchableOpacity>
  );
});
function Center({
  text,
  loading,
  action,
}: {
  text: string;
  loading?: boolean;
  action?: () => void;
}) {
  return (
    <View style={s.center}>
      {loading && <ActivityIndicator color={Colors.primary} />}
      <Text style={s.stateText}>{text}</Text>
      {action && (
        <TouchableOpacity style={s.retry} onPress={action}>
          <Text style={s.retryText}>重新載入</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 50 },
  flex: { flex: 1 },
  petHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  petAvatar: { width: 48, height: 48, borderRadius: 16, marginRight: 12 },
  petAvatarFallback: { width: 48, height: 48, borderRadius: 16, marginRight: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft },
  eyebrow: { color: Colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: Colors.text, fontSize: 23, fontWeight: '800', marginTop: 2 },
  filters: { gap: 8, paddingBottom: 16 },
  filter: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 44,
    backgroundColor: Colors.surface,
  },
  filterActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  filterText: { color: Colors.text },
  filterTextActive: { color: '#FFF', fontWeight: '700' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 30,
  },
  inline: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 15,
  },
  stateText: { color: Colors.subtext, textAlign: 'center', marginTop: 8 },
  emptyBox: { alignItems: 'center', paddingVertical: 38 },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyHint: { color: Colors.subtext, fontSize: 13, marginTop: 8, textAlign: 'center' },
  empty: { color: Colors.text, fontWeight: '700', textAlign: 'center' },
  error: { color: '#C55B5B', textAlign: 'center' },
  retry: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: Colors.text, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 17,
    padding: 14,
    marginBottom: 10,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  kind: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
  date: { color: Colors.subtext, fontSize: 11 },
  itemTitle: { color: Colors.text, fontWeight: '800', marginTop: 5, lineHeight: 20 },
  description: { color: Colors.subtext, marginTop: 4, lineHeight: 19 },
  arrow: { color: Colors.subtext, fontSize: 24, marginLeft: 5 },
  more: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 14,
    padding: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  moreText: { color: Colors.text, fontWeight: '800' },
  moreState: { alignItems: 'center', padding: 14 },
  disabled: { opacity: 0.5 },
});
