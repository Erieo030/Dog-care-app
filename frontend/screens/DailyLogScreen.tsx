import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import SupplementalNotesField from '../components/SupplementalNotesField';
import { Colors } from '../constants/Colors';
import {
  FORM_BUTTON_HEIGHT,
  FORM_BUTTON_RADIUS,
  FORM_FIELD_LABEL_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_WEIGHT,
  FORM_FIELD_LABEL_MARGIN_BOTTOM,
  FORM_FIELD_LABEL_MARGIN_TOP,
  FORM_PAGE_HORIZONTAL_PADDING,
} from '../constants/FormTokens';
import ScreenState from '../components/ScreenState';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { SoftEntrance } from '../components/SoftMotion';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  createDailyLog,
  deleteDailyLog,
  getDailyLogs,
  getDailyLog,
  getTodayDailyLog,
  updateDailyLog,
} from '../services/dailyLogService';
import { DailyLog, DailyEnergyLevel, DailyStoolLevel, DailyWaterLevel } from '../types';
const DAILY_ARTWORKS = {
  'morning-home': require('../assets/artwork/themes/morning-home/page-decorations/daily-checkin-v1.webp'),
  'afternoon-living-room': require('../assets/artwork/themes/afternoon-living-room/page-decorations/daily-checkin-v1.webp'),
  'garden-walk': require('../assets/artwork/themes/garden-walk/page-decorations/daily-checkin-v1.webp'),
};
const water: [DailyWaterLevel, string][] = [
  ['low', '偏少'],
  ['normal', '正常'],
  ['high', '偏多'],
];
const energy: [DailyEnergyLevel, string][] = [
  ['normal', '正常'],
  ['slightly_low', '稍沒精神'],
];
const stool: [DailyStoolLevel, string][] = [
  ['hard', '偏硬'],
  ['normal', '正常'],
  ['soft', '偏軟'],
  ['watery', '水狀'],
];
const dateKey = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};
type Props = NativeStackScreenProps<HomeStackParamList, 'DailyLog'>;
export default function DailyLogScreen({ route, navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const { settings } = useSettings();
  const quickEntry = route.params?.quickEntry === true;
  const [record, setRecord] = useState<DailyLog | null>(null);
  const [history, setHistory] = useState<DailyLog[]>([]);
  const [draft, setDraft] = useState<Partial<DailyLog>>({
    localDate: dateKey(),
    loggedAt: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => {
    if (!session?.userId || !selectedPet) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [today, list] = await Promise.all([
        route.params?.recordId
          ? getDailyLog(session.userId, route.params.recordId, signal)
          : getTodayDailyLog(session.userId, selectedPet.id, undefined, signal),
        quickEntry
          ? Promise.resolve({ records: [] as DailyLog[] })
          : getDailyLogs(session.userId, selectedPet.id, signal),
      ]);
      if (signal?.aborted) return;
      const selectedRecord = route.params?.recordId
        ? (list.records.find((item) => item.id === route.params?.recordId) ??
          (route.params.recordDate
            ? (list.records.find(
                (item) => item.localDate === route.params?.recordDate?.slice(0, 10),
              ) ?? null)
            : null))
        : today.record;
      setRecord(selectedRecord);
      setDraft(selectedRecord || { localDate: dateKey(), loggedAt: new Date().toISOString() });
      setHistory(list.records);
    } catch (e) {
      if (!signal?.aborted) setError((e as Error).message || '載入失敗');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [session?.userId, selectedPet, route.params?.recordId, route.params?.recordDate, quickEntry]);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void load(controller.signal);
      return () => controller.abort();
    }, [load]),
  );
  const set = (k: keyof DailyLog, v: string | boolean | number | undefined) =>
    setDraft((x) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!session?.userId || !selectedPet || saving) return;
    setSaving(true);
    try {
      const data = {
        ...draft,
        localDate: draft.localDate || dateKey(),
        loggedAt: draft.loggedAt || new Date().toISOString(),
      };
      if (record) await updateDailyLog(session.userId, record.id, data);
      else await createDailyLog(session.userId, selectedPet.id, data);
      if (quickEntry) {
        Alert.alert('已記錄', '今天的日常觀察已更新。完整紀錄可到「紀錄」查看。', [
          { text: '完成', onPress: () => navigation.popToTop() },
        ]);
      } else {
        Alert.alert('已儲存', '今日紀錄已更新');
        await load();
      }
    } catch (e) {
      setError((e as Error).message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };
  const remove = () => {
    if (!record || !session?.userId) return;
    Alert.alert('刪除紀錄', '確定刪除這筆日常紀錄？', [
      { text: '取消' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          await deleteDailyLog(session.userId, record.id);
          setRecord(null);
          setDraft({ localDate: dateKey(), loggedAt: new Date().toISOString() });
          await load();
        },
      },
    ]);
  };
  if (loading) return <ScreenState loading text="載入中…" />;
  return (
    <KeyboardAwareScrollView
      contentContainerStyle={[s.page, { paddingBottom: bottomContentPadding }]}
    >
      <View style={s.pageDecoration}>
        <SoftEntrance>
          <Image
            accessible={false}
            resizeMode="contain"
            source={DAILY_ARTWORKS[settings.homeTheme]}
            style={s.pageArtwork}
          />
        </SoftEntrance>
      </View>
      <View style={s.intro}>
        <View style={s.introIcon}>
          <Ionicons name="paw-outline" size={20} color={Colors.primary} />
        </View>
        <View style={s.introCopy}>
          <Text style={s.introTitle}>今天的日常觀察</Text>
          <Text style={s.introHint}>用幾個小選項，留下毛孩今天的狀況。</Text>
        </View>
      </View>
      {error ? (
        <TouchableOpacity onPress={() => void load()}>
          <Text style={s.error}>{error}（點擊重試）</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={s.label}>喝水量</Text>
      <Options values={water} value={draft.waterLevel} onPick={(v) => set('waterLevel', v)} />
      <Text style={s.label}>飼料量</Text>
      <Options values={water} value={draft.foodLevel} onPick={(v) => set('foodLevel', v)} />
      <Text style={s.label}>精神狀態</Text>
      <Options values={energy} value={draft.energyLevel} onPick={(v) => set('energyLevel', v)} />
      <Text style={s.label}>大便狀況</Text>
      <Options values={stool} value={draft.stoolLevel} onPick={(v) => set('stoolLevel', v)} />
      <SupplementalNotesField
        value={draft.notes || ''}
        onChange={(value) => set('notes', value)}
        maxLength={150}
      />
      <AppButton
        title={saving ? '儲存中…' : '儲存今日紀錄'}
        variant="primary"
        disabled={saving}
        busy={saving}
        style={s.save}
        textStyle={s.saveText}
        onPress={save}
      />
      {record ? (
        <TouchableOpacity style={s.deleteAction} onPress={remove}>
          <Text style={s.delete}>刪除今日紀錄</Text>
        </TouchableOpacity>
      ) : null}
      {!quickEntry && <Text style={[s.label, s.historyHeading]}>過往紀錄</Text>}
      {!quickEntry &&
        history.map((x) => (
          <TouchableOpacity
            key={x.id}
            style={s.row}
            onPress={() => {
              setRecord(x);
              setDraft(x);
            }}
          >
            <View style={s.historyDate}>
              <Ionicons name="calendar-outline" size={17} color={Colors.primary} />
              <Text style={s.historyDateText}>{x.localDate}</Text>
            </View>
            <Text style={s.historyNote} numberOfLines={1}>
              {x.notes || '已記錄觀察項目'}
            </Text>
          </TouchableOpacity>
        ))}
    </KeyboardAwareScrollView>
  );
}
function Options({
  values,
  value,
  onPick,
}: {
  values: [string | boolean | number, string][];
  value: string | boolean | number | undefined;
  onPick: (v: string | boolean | number) => void;
}) {
  return (
    <View style={s.options}>
      {values.map(([v, l]) => (
        <TouchableOpacity
          key={String(v)}
          style={[s.chip, value === v && s.selected]}
          onPress={() => onPick(v)}
        >
          <Text style={[s.chipText, value === v && s.selectedText]}>{l}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  page: { paddingHorizontal: FORM_PAGE_HORIZONTAL_PADDING, paddingTop: 18, paddingBottom: 34 },
  pageDecoration: { alignItems: 'flex-end', minHeight: 20, marginBottom: 2 },
  pageArtwork: { width: 76, height: 51 },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.60)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(183,101,59,0.12)',
    padding: 12,
    marginBottom: 2,
  },
  introIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: { flex: 1, minWidth: 0 },
  introTitle: { color: Colors.text, fontSize: 16, fontWeight: '800' },
  introHint: { color: Colors.subtext, fontSize: 12, marginTop: 2, lineHeight: 17 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 14, color: Colors.text },
  label: {
    fontSize: FORM_FIELD_LABEL_FONT_SIZE,
    fontWeight: FORM_FIELD_LABEL_FONT_WEIGHT,
    marginTop: FORM_FIELD_LABEL_MARGIN_TOP,
    marginBottom: FORM_FIELD_LABEL_MARGIN_BOTTOM,
    color: Colors.text,
  },
  historyHeading: { marginTop: 24, marginBottom: 10 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text, fontWeight: '700' },
  selectedText: { color: '#FFF' },
  save: {
    marginTop: 22,
    backgroundColor: Colors.primary,
    padding: 14,
    minHeight: FORM_BUTTON_HEIGHT,
    borderRadius: FORM_BUTTON_RADIUS,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
  error: { color: Colors.danger, marginBottom: 8 },
  deleteAction: {
    alignSelf: 'center',
    minHeight: 44,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
  },
  delete: { color: Colors.danger, textAlign: 'center', fontWeight: '700' },
  row: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyDate: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  historyDateText: { color: Colors.text, fontWeight: '700' },
  historyNote: { flex: 1, color: Colors.subtext, textAlign: 'right' },
});
