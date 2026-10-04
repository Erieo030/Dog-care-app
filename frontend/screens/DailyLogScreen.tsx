import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import { RecordActionButton } from '../components/RecordActionButton';
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
  getDailyLog,
  getTodayDailyLog,
  updateDailyLog,
} from '../services/dailyLogService';
import { classifyStoolPhoto, StoolClassification } from '../services/stoolClassifierService';
import { DailyLog, DailyEnergyLevel, DailyStoolLevel, DailyWaterLevel } from '../types';
import { taipeiDateKey } from '../utils/taipeiDate';
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
const dateKey = taipeiDateKey;
type Props = NativeStackScreenProps<HomeStackParamList, 'DailyLog'>;
export default function DailyLogScreen({ route, navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const { settings } = useSettings();
  const quickEntry = route.params?.quickEntry === true;
  const [record, setRecord] = useState<DailyLog | null>(null);
  const [draft, setDraft] = useState<Partial<DailyLog>>({
    localDate: dateKey(),
    loggedAt: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [classifying, setClassifying] = useState(false);
  const [stoolSuggestion, setStoolSuggestion] = useState<StoolClassification | null>(null);
  const classificationInFlight = useRef(false);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!session?.userId || !selectedPet) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const result = route.params?.recordId
          ? await getDailyLog(session.userId, route.params.recordId, signal)
          : await getTodayDailyLog(
              session.userId,
              selectedPet.id,
              route.params?.recordDate?.slice(0, 10) || dateKey(),
              signal,
            );
        if (signal?.aborted) return;
        const selectedRecord = result.record;
        setRecord(selectedRecord);
        setDraft(selectedRecord || { localDate: dateKey(), loggedAt: new Date().toISOString() });
      } catch (e) {
        if (!signal?.aborted) setError((e as Error).message || '載入失敗');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [session?.userId, selectedPet, route.params?.recordId, route.params?.recordDate],
  );
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void load(controller.signal);
      return () => controller.abort();
    }, [load]),
  );
  const set = (k: keyof DailyLog, v: string | boolean | number | undefined) =>
    setDraft((x) => ({ ...x, [k]: v }));
  const runStoolClassification = async (source: 'camera' | 'library') => {
    if (!session?.userId || !selectedPet || classificationInFlight.current) return;
    classificationInFlight.current = true;
    setClassifying(true);
    setStoolSuggestion(null);
    try {
      const result = await classifyStoolPhoto({
        source,
        userId: session.userId,
        petId: selectedPet.id,
      });
      if (!result) return;
      setStoolSuggestion(result);
      if (result.status === 'ok' && result.suggestedStoolLevel) {
        set('stoolLevel', result.suggestedStoolLevel);
      }
    } catch (classificationError) {
      Alert.alert(
        '暫時無法辨識照片',
        `${(classificationError as Error).message || '請稍後再試'}。你仍可手動選擇大便狀況並儲存紀錄。`,
      );
    } finally {
      classificationInFlight.current = false;
      setClassifying(false);
    }
  };
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
      <View style={s.classifierSection}>
        <View style={s.classifierHeading}>
          <Ionicons name="scan-outline" size={18} color={Colors.primary} />
          <Text style={s.classifierTitle}>照片分類建議</Text>
        </View>
        <Text style={s.classifierHint}>
          你選擇辨識後，照片會送至 MEGO 後端暫時處理，不會存入照護紀錄或附件，也不會傳給 MEGO
          AI。結果僅供參考，請確認下方選項。
        </Text>
        <View style={s.classifierActions}>
          <AppButton
            title={classifying ? '辨識中…' : '拍照辨識'}
            variant="secondary"
            disabled={classifying}
            accessibilityLabel="拍攝糞便照片並取得分類建議"
            style={s.classifierButton}
            onPress={() => void runStoolClassification('camera')}
          >
            {classifying ? (
              <ActivityIndicator color={Colors.success} />
            ) : (
              <Ionicons name="camera-outline" size={19} color={Colors.success} />
            )}
            <Text style={s.classifierButtonText}>{classifying ? '辨識中…' : '拍照辨識'}</Text>
          </AppButton>
          <AppButton
            title="從相簿選擇"
            variant="secondary"
            disabled={classifying}
            accessibilityLabel="從相簿選取糞便照片並取得分類建議"
            style={s.classifierButton}
            onPress={() => void runStoolClassification('library')}
          >
            <Ionicons name="images-outline" size={19} color={Colors.success} />
            <Text style={s.classifierButtonText}>從相簿選擇</Text>
          </AppButton>
        </View>
        {stoolSuggestion ? (
          <View style={s.suggestion} accessibilityLiveRegion="polite">
            <Text style={s.suggestionTitle}>
              {stoolSuggestion.status === 'ok'
                ? `照片建議：${stoolSuggestion.suggestedStoolLabel}（信心 ${Math.round(stoolSuggestion.confidence * 100)}%）`
                : stoolSuggestion.message || '目前無法判斷照片'}
            </Text>
            <Text style={s.suggestionText}>
              {stoolSuggestion.status === 'ok'
                ? `目前選擇：${stool.find(([value]) => value === draft.stoolLevel)?.[1] || '尚未選擇'}。請確認或手動修改，再儲存紀錄。`
                : '請重新拍攝，或直接手動選擇大便狀況。'}
            </Text>
            <Text style={s.suggestionDisclaimer}>{stoolSuggestion.disclaimer}</Text>
          </View>
        ) : null}
      </View>
      <SupplementalNotesField
        value={draft.notes || ''}
        onChange={(value) => set('notes', value)}
        maxLength={150}
      />
      <AppButton
        title={saving ? '儲存中…' : record ? '儲存這筆紀錄' : '儲存今日紀錄'}
        variant="primary"
        disabled={saving}
        busy={saving}
        style={s.save}
        textStyle={s.saveText}
        onPress={save}
      />
      {record && !quickEntry ? (
        <RecordActionButton
          kind="delete"
          label="刪除這筆紀錄"
          style={s.deleteAction}
          onPress={remove}
        />
      ) : null}
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
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  classifierSection: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  classifierHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  classifierTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
  classifierHint: { color: Colors.subtext, fontSize: 12, lineHeight: 17, marginTop: 5 },
  classifierActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  classifierButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    paddingHorizontal: 8,
    flexDirection: 'row',
    gap: 6,
  },
  classifierButtonText: { color: Colors.success, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  suggestion: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  suggestionTitle: { color: Colors.text, fontSize: 13, lineHeight: 19, fontWeight: '800' },
  suggestionText: { color: Colors.subtext, fontSize: 12, lineHeight: 17, marginTop: 3 },
  suggestionDisclaimer: { color: Colors.subtext, fontSize: 11, lineHeight: 16, marginTop: 5 },
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
    marginTop: 8,
  },
});
