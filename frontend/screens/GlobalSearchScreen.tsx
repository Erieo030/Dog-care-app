/** 用途：跨體重、健康、就醫、提醒與時間軸搜尋，支援後端篩選及分頁。 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DatePickerField from '../components/DatePickerField';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import {
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
} from '../services/searchHistoryService';
import { searchRecords } from '../services/searchService';
import {
  SearchAttachmentFilter,
  SearchFilters,
  SearchHealthCategory,
  SearchReminderStatus,
  SearchResultItem,
  SearchResultType,
  SearchSort,
} from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'GlobalSearch'>;
type Period = 'all' | 7 | 30 | 90 | 'custom';
type SearchListEntry = { kind: 'heading'; id: string; label: string } | { kind: 'item'; id: string; item: SearchResultItem };
const EMPTY: SearchFilters = {
  query: '',
  types: [],
  healthCategories: [],
  clinic: '',
  veterinarian: '',
  attachment: 'any',
  reminderStatus: 'any',
  sort: 'newest',
};
const TYPE_OPTIONS: Array<[SearchResultType, string]> = [
  ['weight', '體重'],
  ['health_event', '健康異常'],
  ['medical_visit', '就醫'],
  ['reminder', '提醒'],
  ['deworming', '驅蟲'],
  ['medication', '用藥'],
];
const HEALTH_OPTIONS: Array<[SearchHealthCategory, string]> = [
  ['digestive', '消化'],
  ['skin', '皮膚'],
  ['respiratory', '呼吸'],
  ['eye', '眼睛／耳朵'],
  ['injury', '外傷／誤食'],
  ['other', '其他'],
];
const TYPE_META: Record<SearchResultType, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  weight: { label: '體重', icon: 'scale-outline' },
  health_event: { label: '健康異常', icon: 'alert-circle-outline' },
  medical_visit: { label: '就醫', icon: 'business-outline' },
  reminder: { label: '提醒', icon: 'notifications-outline' },
  deworming: { label: '驅蟲', icon: 'shield-checkmark-outline' },
  medication: { label: '用藥', icon: 'medical-outline' },
};
export default function GlobalSearchScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [filters, setFilters] = useState<SearchFilters>(EMPTY);
  const [period, setPeriod] = useState<Period>('all');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const requestId = useRef(0);
  const groupedEntries = useMemo<SearchListEntry[]>(() => {
    const groups = new Map<SearchResultType, SearchResultItem[]>();
    items.forEach((item) => groups.set(item.type, [...(groups.get(item.type) || []), item]));
    return Array.from(groups.entries()).flatMap(([type, group]) => [
      { kind: 'heading' as const, id: `group-${type}`, label: TYPE_META[type].label },
      ...group.map((item) => ({ kind: 'item' as const, id: item.id, item })),
    ]);
  }, [items]);

  useEffect(() => {
    if (session?.userId) getSearchHistory(session.userId).then(setHistory);
  }, [session?.userId]);
  const load = useCallback(
    async (nextPage = 1) => {
      if (!session?.userId || !selectedPet) {
        setItems([]);
        setLoading(false);
        return;
      }
      const id = ++requestId.current;
      if (nextPage === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        setError('');
        const result = await searchRecords(session.userId, selectedPet.id, filters, nextPage);
        if (id !== requestId.current) return;
        setItems((old) =>
          nextPage === 1
            ? result.items
            : [...old, ...result.items.filter((x) => !old.some((y) => y.id === x.id))],
        );
        setPage(result.page);
        setTotal(result.total);
        setHasMore(result.hasMore);
      } catch (e) {
        if (id === requestId.current) setError((e as Error).message || '搜尋失敗');
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [filters, selectedPet, session?.userId],
  );
  useEffect(() => {
    setItems([]);
    if (!hasSearched) {
      setTotal(0);
      setHasMore(false);
      return;
    }
    const timer = setTimeout(() => load(1), 400);
    return () => clearTimeout(timer);
  }, [hasSearched, load]);
  const applyPeriod = (value: Period) => {
    setPeriod(value);
    if (value === 'custom') return;
    setFilters((current) => {
      if (value === 'all') return { ...current, startAt: undefined, endAt: undefined };
      const start = new Date();
      start.setDate(start.getDate() - value);
      return { ...current, startAt: start.toISOString(), endAt: new Date().toISOString() };
    });
  };
  const toggle = <T extends string>(values: T[], value: T) =>
    values.includes(value) ? values.filter((x) => x !== value) : [...values, value];
  const submit = async () => {
    if (session?.userId && filters.query.trim())
      setHistory(await addSearchHistory(session.userId, filters.query));
    setHasSearched(true);
  };
  const chooseHistory = (value: string) => setFilters((current) => ({ ...current, query: value }));
  const clear = async () => {
    if (!session?.userId) return;
    await clearSearchHistory(session.userId);
    setHistory([]);
  };
  const open = (item: SearchResultItem) => {
    if (item.type === 'weight') navigation.navigate('WeightList', { focusRecordId: item.sourceId });
    else if (item.type === 'health_event')
      navigation.navigate('HealthEventDetail', { eventId: item.sourceId });
    else if (item.type === 'medical_visit')
      navigation.navigate('MedicalVisitDetail', { visitId: item.sourceId });
    else if (item.type === 'deworming')
      navigation.navigate('DewormingDetail', { recordId: item.sourceId });
    else if (item.type === 'medication')
      navigation.navigate('MedicationDetail', { recordId: item.sourceId });
    else navigation.navigate('ReminderList', { focusReminderId: item.sourceId });
  };
  const quickEntries: Array<[keyof typeof Ionicons.glyphMap, string, () => void]> = [
    ['time-outline', '最近 7 天', () => { applyPeriod(7); setHasSearched(true); }],
    ['calendar-outline', '最近 30 天', () => { applyPeriod(30); setHasSearched(true); }],
    ['alert-circle-outline', '健康異常', () => { setFilters((x) => ({ ...x, types: ['health_event'] })); setHasSearched(true); }],
    ['notifications-outline', '提醒', () => { setFilters((x) => ({ ...x, types: ['reminder'] })); setHasSearched(true); }],
  ];
  const header = (
    <View>
      <View style={s.intro}>
        <Text style={s.pageTitle}>找找毛孩的照護紀錄</Text>
        <Text style={s.pageSubtitle}>搜尋日期、提醒、健康狀況或體重</Text>
      </View>
      <View style={s.searchRow}>
        <TextInput
          value={filters.query}
          onChangeText={(query) => setFilters((x) => ({ ...x, query }))}
          onSubmitEditing={submit}
          returnKeyType="search"
          placeholder="搜尋日期、標題、備註、醫院、醫師、症狀、藥物或體重"
          placeholderTextColor={Colors.subtext}
          style={s.search}
        />
        <TouchableOpacity style={s.searchButton} onPress={submit}>
          <Text style={s.searchButtonText}>搜尋</Text>
        </TouchableOpacity>
      </View>
      {!hasSearched && (
        <View style={s.quickBlock}>
          <Text style={s.quickTitle}>快速找紀錄</Text>
          <View style={s.quickGrid}>
            {quickEntries.map(([icon, label, onPress]) => (
              <TouchableOpacity key={String(label)} style={s.quickItem} onPress={onPress}>
                <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={Colors.success} />
                <Text style={s.quickText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.emptyPrompt}>
            <Ionicons name="paw-outline" size={28} color={Colors.primary} />
            <Text style={s.promptTitle}>輸入關鍵字，開始尋找紀錄</Text>
            <Text style={s.promptText}>也可以先選上方快速入口，再查看結果。</Text>
          </View>
        </View>
      )}
      {!!history.length && (
        <View style={s.block}>
          <View style={s.blockHead}>
            <Text style={s.blockTitle}>最近搜尋</Text>
            <TouchableOpacity onPress={clear}>
              <Text style={s.clear}>清除紀錄</Text>
            </TouchableOpacity>
          </View>
          <View style={s.chips}>
            {history.map((value) => (
              <Chip key={value} label={value} active={false} onPress={() => chooseHistory(value)} />
            ))}
          </View>
        </View>
      )}
      <TouchableOpacity style={s.advancedToggle} onPress={() => setAdvancedOpen((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: advancedOpen }}>
        <Text style={s.advancedLabel}>進階搜尋</Text>
        <Text style={s.advancedHint}>{advancedOpen ? '收合條件' : '日期、類型、狀態與排序'} {advancedOpen ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>
      {advancedOpen && <View style={s.advancedPanel}>
      <FilterTitle title="日期區間" />
      <View style={s.chips}>
        {(
          [
            ['all', '全部'],
            [7, '最近 7 天'],
            [30, '最近 30 天'],
            [90, '最近 90 天'],
            ['custom', '自訂日期'],
          ] as Array<[Period, string]>
        ).map(([value, label]) => (
          <Chip
            key={String(value)}
            label={label}
            active={period === value}
            onPress={() => applyPeriod(value)}
          />
        ))}
      </View>
      {period === 'custom' && (
        <View style={s.dateRow}>
          <DatePickerField
            label="開始日期"
            value={filters.startAt ? new Date(filters.startAt) : undefined}
            maximumDate={new Date()}
            onChange={(date) => {
              date.setHours(0, 0, 0, 0);
              setFilters((x) => ({ ...x, startAt: date.toISOString() }));
            }}
          />
          <DatePickerField
            label="結束日期"
            value={filters.endAt ? new Date(filters.endAt) : undefined}
            maximumDate={new Date()}
            onChange={(date) => {
              date.setHours(23, 59, 59, 999);
              setFilters((x) => ({ ...x, endAt: date.toISOString() }));
            }}
          />
        </View>
      )}
      <FilterTitle title="事件分類" />
      <View style={s.chips}>
        {TYPE_OPTIONS.map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            active={filters.types.includes(value)}
            onPress={() => setFilters((x) => ({ ...x, types: toggle(x.types, value) }))}
          />
        ))}
      </View>
      <FilterTitle title="健康事件類別" />
      <View style={s.chips}>
        {HEALTH_OPTIONS.map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            active={filters.healthCategories.includes(value)}
            onPress={() =>
              setFilters((x) => ({ ...x, healthCategories: toggle(x.healthCategories, value) }))
            }
          />
        ))}
      </View>
      <FilterTitle title="就醫條件" />
      <View style={s.two}>
        <TextInput
          value={filters.clinic}
          onChangeText={(clinic) => setFilters((x) => ({ ...x, clinic }))}
          placeholder="醫院"
          placeholderTextColor={Colors.subtext}
          style={s.field}
        />
        <TextInput
          value={filters.veterinarian}
          onChangeText={(veterinarian) => setFilters((x) => ({ ...x, veterinarian }))}
          placeholder="醫師"
          placeholderTextColor={Colors.subtext}
          style={s.field}
        />
      </View>
      <FilterTitle title="體重區間（kg）" />
      <View style={s.two}>
        <NumberField
          value={filters.minWeight}
          placeholder="最低"
          onChange={(minWeight) => setFilters((x) => ({ ...x, minWeight }))}
        />
        <NumberField
          value={filters.maxWeight}
          placeholder="最高"
          onChange={(maxWeight) => setFilters((x) => ({ ...x, maxWeight }))}
        />
      </View>
      <FilterTitle title="照片" />
      <Choice<SearchAttachmentFilter>
        value={filters.attachment}
        options={[
          ['any', '不限'],
          ['with', '有照片'],
          ['without', '沒有照片'],
        ]}
        onChange={(attachment) => setFilters((x) => ({ ...x, attachment }))}
      />
      <FilterTitle title="提醒狀態" />
      <Choice<SearchReminderStatus>
        value={filters.reminderStatus}
        options={[
          ['any', '不限'],
          ['completed', '完成'],
          ['pending', '未完成'],
          ['overdue', '逾期'],
        ]}
        onChange={(reminderStatus) => setFilters((x) => ({ ...x, reminderStatus }))}
      />
      <FilterTitle title="排序" />
      <Choice<SearchSort>
        value={filters.sort}
        options={[
          ['newest', '最新'],
          ['oldest', '最舊'],
          ['az', 'A-Z'],
          ['za', 'Z-A'],
        ]}
        onChange={(sort) => setFilters((x) => ({ ...x, sort }))}
      />
      </View>}
      {hasSearched && <View style={s.resultHead}>
        <Text style={s.resultTitle}>搜尋結果</Text>
        <Text style={s.total}>{total} 筆</Text>
        <TouchableOpacity
          onPress={() => {
            setPeriod('all');
            setFilters(EMPTY);
          }}
        >
          <Text style={s.clear}>重設篩選</Text>
        </TouchableOpacity>
      </View>}
      {hasSearched && error && (
        <View style={s.errorBox}>
          <Text style={s.error}>{error}</Text>
          <TouchableOpacity onPress={() => load(1)}>
            <Text style={s.clear}>重試</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={groupedEntries}
        keyExtractor={(x) => x.id}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListHeaderComponent={header}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: entry }) => {
          if (entry.kind === 'heading') return <Text style={s.resultGroupHeading}>{entry.label}</Text>;
          const item = entry.item;
          return (
          <TouchableOpacity style={s.result} onPress={() => open(item)}>
            <View style={s.icon}>
              <Ionicons name={TYPE_META[item.type].icon} size={22} color={Colors.success} />
            </View>
            <View style={s.flex}>
              <View style={s.meta}>
                <Text style={s.kind}>{TYPE_META[item.type].label}</Text>
                <Text style={s.date}>{new Date(item.occurredAt).toLocaleDateString('zh-TW')}</Text>
              </View>
              <Text style={s.title}>{item.title}</Text>
              {!!item.description && (
                <Text style={s.description} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              {item.attachmentCount > 0 && (
                <Text style={s.photo}>📷 {item.attachmentCount} 張照片</Text>
              )}
            </View>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !hasSearched ? null : loading ? (
            <View style={s.state}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={s.muted}>搜尋中…</Text>
            </View>
          ) : !error ? (
            <View style={s.state}>
              <Text style={s.stateIcon}>🔎</Text>
              <Text style={s.muted}>沒有找到符合資料。</Text>
            </View>
          ) : null
        }
        onEndReached={() => hasMore && !loadingMore && load(page + 1)}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={s.footer} color={Colors.primary} /> : null
        }
      />
    </SafeAreaView>
  );
}
function FilterTitle({ title }: { title: string }) {
  return <Text style={s.filterTitle}>{title}</Text>;
}
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.chip, active && s.chipActive]} onPress={onPress}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<[T, string]>;
  onChange: (x: T) => void;
}) {
  return (
    <View style={s.chips}>
      {options.map(([key, label]) => (
        <Chip key={key} label={label} active={value === key} onPress={() => onChange(key)} />
      ))}
    </View>
  );
}
function NumberField({
  value,
  placeholder,
  onChange,
}: {
  value?: number;
  placeholder: string;
  onChange: (x: number | undefined) => void;
}) {
  return (
    <TextInput
      value={value == null ? '' : String(value)}
      onChangeText={(text) => onChange(text.trim() === '' ? undefined : Number(text))}
      keyboardType="decimal-pad"
      placeholder={placeholder}
      placeholderTextColor={Colors.subtext}
      style={s.field}
    />
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 55 },
  flex: { flex: 1 },
  intro: { marginBottom: 14 },
  pageTitle: { color: Colors.text, fontSize: 24, fontWeight: '900' },
  pageSubtitle: { color: Colors.subtext, marginTop: 4, fontSize: 14 },
  searchRow: { flexDirection: 'row', gap: 8 },
  quickBlock: { marginTop: 22 },
  quickTitle: { color: Colors.text, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickItem: { width: '48%', minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  quickText: { color: Colors.text, fontWeight: '700' },
  emptyPrompt: { alignItems: 'center', paddingVertical: 34 },
  promptTitle: { color: Colors.text, fontWeight: '800', marginTop: 8 },
  promptText: { color: Colors.subtext, fontSize: 13, marginTop: 4 },
  search: {
    flex: 1,
    minHeight: 52,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 15,
    paddingHorizontal: 14,
    color: Colors.text,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  searchButtonText: { color: '#fff', fontWeight: '800' },
  block: { marginTop: 14 },
  blockHead: { flexDirection: 'row', justifyContent: 'space-between' },
  blockTitle: { color: Colors.text, fontWeight: '800' },
  clear: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  advancedToggle: { marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  advancedLabel: { color: Colors.text, fontWeight: '800' },
  advancedHint: { color: Colors.subtext, fontSize: 12 },
  advancedPanel: { paddingBottom: 4 },
  filterTitle: { color: Colors.text, fontWeight: '800', marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 44,
  },
  chipActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  chipText: { color: Colors.text, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  two: { flexDirection: 'row', gap: 8 },
  field: {
    flex: 1,
    minHeight: 48,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 13,
    paddingHorizontal: 12,
    color: Colors.text,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  dateButton: {
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  dateText: { color: Colors.text },
  resultHead: { flexDirection: 'row', alignItems: 'center', marginTop: 26, marginBottom: 8 },
  resultTitle: { color: Colors.text, fontSize: 20, fontWeight: '900', flex: 1 },
  total: { color: Colors.subtext, fontSize: 12, marginRight: 10 },
  resultGroupHeading: { color: Colors.text, fontSize: 15, fontWeight: '800', marginTop: 14, marginBottom: 7 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 13,
    marginBottom: 9,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  kind: { color: Colors.primary, fontSize: 11, fontWeight: '800' },
  date: { color: Colors.subtext, fontSize: 11 },
  title: { color: Colors.text, fontWeight: '800', marginTop: 4 },
  description: { color: Colors.subtext, fontSize: 12, marginTop: 3 },
  photo: { color: Colors.subtext, fontSize: 11, marginTop: 4 },
  arrow: { fontSize: 23, color: Colors.subtext, marginLeft: 5 },
  state: { alignItems: 'center', paddingVertical: 45 },
  stateIcon: { fontSize: 32, marginBottom: 8 },
  muted: { color: Colors.subtext, marginTop: 8 },
  errorBox: { backgroundColor: '#FFF1F0', borderRadius: 12, padding: 12, marginBottom: 10 },
  error: { color: '#A33', marginBottom: 5 },
  footer: { padding: 16 },
});
