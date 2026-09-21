import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import WeightTrendChart from '../components/dashboard/WeightTrendChart';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { getVetVisitBrief, VetBriefSection, VetVisitBrief } from '../services/aiService';
import { DashboardWeightPoint } from '../types';

const RANGES = [7, 15, 30] as const;
const SECTION_OPTIONS: { key: VetBriefSection; label: string }[] = [
  { key: 'health', label: '健康異常' }, { key: 'weight', label: '體重趨勢' },
  { key: 'medications', label: '目前用藥' }, { key: 'medical', label: '近期就醫' },
  { key: 'daily', label: '日常觀察' }, { key: 'vaccinations', label: '疫苗' },
  { key: 'dewormings', label: '驅蟲' }, { key: 'reminders', label: '待辦提醒' },
];
const DEFAULT_SECTIONS: VetBriefSection[] = ['health', 'weight', 'medications', 'medical'];
const EVENT_LABELS: Record<string, string> = { vomiting: '嘔吐', abnormal_stool: '排便異常', low_appetite: '食慾下降', abnormal_drinking: '喝水異常', low_energy: '精神下降', injury: '受傷', skin_issue: '皮膚問題', eye_ear_issue: '眼睛／耳朵問題', possible_ingestion: '疑似誤食', other: '其他異常' };
const SEVERITY_LABELS: Record<string, string> = { mild: '輕微', moderate: '需要注意', severe: '嚴重' };
const DAILY_LABELS: Record<string, Record<string, string>> = { water: { low: '偏少', normal: '正常', high: '偏多' }, food: { low: '偏少', normal: '正常', high: '偏多' }, energy: { low: '沒精神', normal: '正常' }, stool: { '2': '偏硬', '3': '正常', '4': '偏軟', '5': '水狀' } };

const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }) : '未填寫';
const sexLabel = (value?: string) => value === 'male' ? '公' : value === 'female' ? '母' : '未填寫';
const ageLabel = (birthday?: string) => {
  if (!birthday) return '年齡未填寫';
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return '年齡未填寫';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
  return `${Math.max(0, age)} 歲`;
};

export default function PreVetSummaryScreen() {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const [draftSections, setDraftSections] = useState<VetBriefSection[]>(DEFAULT_SECTIONS);
  const [appliedSections, setAppliedSections] = useState<VetBriefSection[]>(DEFAULT_SECTIONS);
  const [brief, setBrief] = useState<VetVisitBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [error, setError] = useState('');
  const [narrativeError, setNarrativeError] = useState('');
  const appliedKey = appliedSections.join(',');
  const draftChanged = draftSections.join(',') !== appliedKey;

  const load = useCallback(async () => {
    if (!session?.userId || !selectedPet?.id) return;
    setLoading(true);
    setError('');
    setNarrativeError('');
    try {
      setBrief(await getVetVisitBrief(session.userId, selectedPet.id, range, false, appliedSections));
    } catch (caught) {
      setBrief(null);
      setError((caught as Error).message || '摘要載入失敗');
    } finally {
      setLoading(false);
    }
  }, [appliedKey, range, selectedPet?.id, session?.userId]);

  useEffect(() => { void load(); }, [load]);

  const toggleSection = (section: VetBriefSection) => {
    setDraftSections((current) => current.includes(section) ? current.filter((value) => value !== section) : [...current, section]);
  };

  const applySections = () => {
    if (!draftSections.length) {
      Alert.alert('請保留一種資料', '至少選擇一種照護資料，才能建立就醫前摘要。');
      return;
    }
    setAppliedSections(draftSections);
  };

  const enhanceWithAI = useCallback(async () => {
    if (!session?.userId || !selectedPet?.id || narrativeLoading) return;
    setNarrativeLoading(true);
    setNarrativeError('');
    try {
      setBrief(await getVetVisitBrief(session.userId, selectedPet.id, range, true, appliedSections));
    } catch (caught) {
      setNarrativeError((caught as Error).message || 'AI 補充整理失敗，已保留原本摘要。');
    } finally {
      setNarrativeLoading(false);
    }
  }, [appliedKey, narrativeLoading, range, selectedPet?.id, session?.userId]);

  const weightPoints = useMemo<DashboardWeightPoint[]>(() => (brief?.weightSummary.series || []).map((item, index) => ({ id: `${item.measuredAt}-${index}`, measuredAt: item.measuredAt, weightKg: item.weightKg })), [brief?.weightSummary.series]);

  const share = async () => {
    if (!brief) return;
    const lines = [
      `${brief.pet.name || selectedPet?.name || '毛孩'} 就醫前摘要`,
      `資料範圍：近 ${brief.period.days} 天`,
      `基本資料：${brief.pet.breed || '品種未填寫'}・${sexLabel(brief.pet.sex)}・${ageLabel(brief.pet.birthDate)}・${brief.pet.isNeutered ? '已結紮' : '未結紮'}`,
      `過敏資訊：${brief.pet.allergies || '無／未填寫'}`,
      `慢性病：${brief.pet.chronicDiseases || '無／未填寫'}`,
    ];
    if (appliedSections.includes('health')) lines.push('', '健康異常', ...brief.recentHealthEvents.map((item) => `• ${dateLabel(item.occurredAt)} ${EVENT_LABELS[item.type] || '健康異常'}／${SEVERITY_LABELS[item.severity] || item.severity}：${item.summary}${item.notes ? `；${item.notes}` : ''}`));
    if (appliedSections.includes('weight') && weightPoints.length) lines.push('', '體重趨勢', ...weightPoints.map((item) => `• ${dateLabel(item.measuredAt)} ${item.weightKg} kg`));
    if (appliedSections.includes('medications')) lines.push('', '目前用藥', ...(brief.activeMedications.length ? brief.activeMedications.map((item) => `• ${item.name}：${item.instructions || '依醫囑使用'}`) : ['• 目前沒有進行中的用藥紀錄']));
    if (appliedSections.includes('medical')) lines.push('', '近期就醫', ...(brief.recentMedicalVisits.length ? brief.recentMedicalVisits.map((item) => `• ${dateLabel(item.visitedAt)} ${item.reason}${item.clinicName ? `／${item.clinicName}` : ''}`) : ['• 尚無近期就醫紀錄']));
    lines.push('', '可向獸醫確認', ...brief.vetQuestions.map((item) => `• ${item}`), '', brief.disclaimer);
    try { await Share.share({ message: lines.join('\n') }); } catch (caught) { Alert.alert('分享失敗', (caught as Error).message); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.title}>就醫前摘要</Text>
          <Text style={styles.subtitle}>選擇要帶去看診的資料，整理成容易閱讀的重點。</Text>
        </View>

        <View style={styles.rangeRow}>{RANGES.map((value) => <TouchableOpacity key={value} accessibilityRole="button" style={[styles.chip, range === value && styles.activeChip]} onPress={() => setRange(value)}><Text style={[styles.chipText, range === value && styles.activeChipText]}>近 {value} 天</Text></TouchableOpacity>)}</View>

        <View style={styles.selector}>
          <Text style={styles.selectorTitle}>選擇要帶入的資料</Text>
          <Text style={styles.selectorHint}>未選取資料不會顯示、分享或提供給 AI。</Text>
          <View style={styles.optionWrap}>{SECTION_OPTIONS.map((option) => <TouchableOpacity key={option.key} accessibilityRole="checkbox" accessibilityState={{ checked: draftSections.includes(option.key) }} style={[styles.option, draftSections.includes(option.key) && styles.optionActive]} onPress={() => toggleSection(option.key)}><Text style={[styles.optionText, draftSections.includes(option.key) && styles.optionTextActive]}>{draftSections.includes(option.key) ? '✓ ' : ''}{option.label}</Text></TouchableOpacity>)}</View>
          {draftChanged && <TouchableOpacity accessibilityRole="button" style={styles.applyButton} onPress={applySections}><Text style={styles.applyButtonText}>更新摘要</Text></TouchableOpacity>}
        </View>

        {loading && <Text style={styles.loading}>正在整理已選擇的照護資料…</Text>}
        {!!error && <Text style={styles.error}>{error}</Text>}

        {!!brief && !loading && <>
          <Section title="毛孩基本資料">
            <TableRow label="基本資訊" value={`${brief.pet.breed || '品種未填寫'}・${sexLabel(brief.pet.sex)}・${ageLabel(brief.pet.birthDate)}・${brief.pet.isNeutered ? '已結紮' : '未結紮'}`} />
            <TableRow label="過敏資訊" value={brief.pet.allergies || '無／未填寫'} />
            <TableRow label="慢性病" value={brief.pet.chronicDiseases || '無／未填寫'} />
          </Section>

          {appliedSections.includes('health') && <Section title="健康異常"><HealthTable items={brief.recentHealthEvents} /></Section>}
          {appliedSections.includes('weight') && <Section title="體重趨勢"><WeightSummary brief={brief} points={weightPoints} /></Section>}
          {appliedSections.includes('medications') && <Section title="目前用藥"><MedicationTable items={brief.activeMedications} /></Section>}
          {appliedSections.includes('medical') && <Section title="近期就醫"><MedicalTable items={brief.recentMedicalVisits} /></Section>}
          {appliedSections.includes('daily') && <Section title="日常觀察"><DailySummary brief={brief} /></Section>}
          {appliedSections.includes('vaccinations') && <Section title="疫苗"><LatestCare label="最近接種" value={brief.vaccination.latest?.vaccineName} date={brief.vaccination.latest?.administeredAt} due={brief.vaccination.latest?.nextDueAt} /></Section>}
          {appliedSections.includes('dewormings') && <Section title="驅蟲"><LatestCare label="最近使用" value={brief.deworming.latest?.productName} date={brief.deworming.latest?.administeredAt} due={brief.deworming.latest?.nextDueAt} /></Section>}
          {appliedSections.includes('reminders') && <Section title="待辦提醒"><ReminderTable items={brief.upcomingReminders} /></Section>}

          <Section title="可以向獸醫確認">{brief.vetQuestions.map((item, index) => <Text key={`${item}-${index}`} style={styles.item}>• {item}</Text>)}</Section>

          {brief.generationMode !== 'deterministic' && <View style={styles.aiResult}><Text style={styles.aiResultTitle}>AI 補充整理</Text><Text style={styles.item}>{brief.generatedSummary}</Text></View>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="使用 AI 補充整理就醫摘要" disabled={narrativeLoading} style={[styles.aiButton, narrativeLoading && styles.disabledButton]} onPress={enhanceWithAI}><Text style={styles.aiButtonText}>{narrativeLoading ? 'AI 正在補充整理…' : 'AI 補充整理'}</Text><Text style={styles.aiButtonHint}>可選功能，最多等待約 15 秒</Text></TouchableOpacity>
          {!!narrativeError && <Text style={styles.error}>{narrativeError}</Text>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="分享就醫前摘要" style={styles.shareButton} onPress={share}><Text style={styles.shareButtonText}>分享摘要</Text></TouchableOpacity>
          <Text style={styles.disclaimer}>{brief.disclaimer}</Text>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.heading}>{title}</Text><View style={styles.table}>{children}</View></View>; }
function TableRow({ label, value }: { label: string; value: string }) { return <View style={styles.tableRow}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>; }
function HealthTable({ items }: { items: VetVisitBrief['recentHealthEvents'] }) { return items.length ? <>{items.map((item) => <View key={item.id} style={styles.tableRow}><Text style={styles.rowLabel}>{dateLabel(item.occurredAt)}</Text><View style={styles.flexValue}><Text style={styles.rowValue}>{EVENT_LABELS[item.type] || '健康異常'}・{SEVERITY_LABELS[item.severity] || item.severity}</Text><Text style={styles.rowDetail}>{item.summary}{item.notes ? `：${item.notes}` : ''}</Text></View></View>)}</> : <Empty text="此期間沒有健康異常紀錄" />; }
function MedicationTable({ items }: { items: VetVisitBrief['activeMedications'] }) { return items.length ? <>{items.map((item, index) => <View key={`${item.name}-${index}`} style={styles.tableRow}><Text style={styles.rowLabel}>{item.name}</Text><View style={styles.flexValue}><Text style={styles.rowValue}>{item.instructions || '依醫囑使用'}</Text><Text style={styles.rowDetail}>{item.startDate ? `開始：${item.startDate}` : '開始日期未填寫'}{item.timesPerDay ? `・每日 ${item.timesPerDay} 次` : ''}</Text></View></View>)}</> : <Empty text="目前沒有進行中的用藥紀錄" />; }
function MedicalTable({ items }: { items: VetVisitBrief['recentMedicalVisits'] }) { return items.length ? <>{items.map((item) => <View key={item.id} style={styles.tableRow}><Text style={styles.rowLabel}>{dateLabel(item.visitedAt)}</Text><View style={styles.flexValue}><Text style={styles.rowValue}>{item.reason}</Text><Text style={styles.rowDetail}>{[item.clinicName, item.treatmentNotes].filter(Boolean).join('・') || '未補充治療說明'}</Text></View></View>)}</> : <Empty text="尚無近期就醫紀錄" />; }
function ReminderTable({ items }: { items: VetVisitBrief['upcomingReminders'] }) { return items.length ? <>{items.map((item, index) => <TableRow key={`${item.title}-${index}`} label={dateLabel(item.scheduledAt)} value={item.title} />)}</> : <Empty text="目前沒有待辦提醒" />; }
function DailySummary({ brief }: { brief: VetVisitBrief }) { const summary = brief.dailyLogSummary; return <><TableRow label="日常筆數" value={`${summary.recordCount} 筆`} /><TableRow label="最新狀況" value={`喝水 ${DAILY_LABELS.water[summary.water?.latest || ''] || '未填寫'}・食量 ${DAILY_LABELS.food[summary.food?.latest || ''] || '未填寫'}・精神 ${DAILY_LABELS.energy[summary.energy?.latest || ''] || '未填寫'}・排便 ${DAILY_LABELS.stool[String(summary.stool?.latest || '')] || '未填寫'}`} /></>; }
function LatestCare({ label, value, date, due }: { label: string; value?: string; date?: string; due?: string }) { return value ? <><TableRow label={label} value={value} /><TableRow label="使用日期" value={dateLabel(date)} />{due && <TableRow label="下次日期" value={dateLabel(due)} />}</> : <Empty text="尚無相關紀錄" />; }
function WeightSummary({ brief, points }: { brief: VetVisitBrief; points: DashboardWeightPoint[] }) { const difference = brief.weightSummary.differenceKg; return <><TableRow label="最新體重" value={brief.weightSummary.latestWeightKg != null ? `${brief.weightSummary.latestWeightKg} kg` : '未記錄'} />{difference != null && <TableRow label="最近變化" value={`${difference > 0 ? '+' : ''}${difference.toFixed(2)} kg`} />}{points.length > 1 ? <WeightTrendChart items={points} /> : <Empty text="至少需要兩筆體重紀錄才能顯示趨勢" />}</>; }
function Empty({ text }: { text: string }) { return <Text style={styles.empty}>{text}</Text>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background }, content: { padding: 20, paddingBottom: 36, gap: 18 }, title: { fontSize: 26, fontWeight: '800', color: Colors.text }, subtitle: { marginTop: 6, color: Colors.subtext, fontSize: 15, lineHeight: 22 }, rangeRow: { flexDirection: 'row', gap: 8 }, chip: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 16, backgroundColor: Colors.peachSoft }, activeChip: { backgroundColor: Colors.primary }, chipText: { color: Colors.subtext, fontWeight: '700' }, activeChipText: { color: Colors.surface }, selector: { borderRadius: 18, backgroundColor: Colors.surfaceSoft, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 8 }, selectorTitle: { color: Colors.text, fontSize: 17, fontWeight: '800' }, selectorHint: { color: Colors.subtext, fontSize: 13, lineHeight: 19 }, optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }, optionActive: { backgroundColor: Colors.successSoft, borderColor: Colors.success }, optionText: { color: Colors.subtext, fontWeight: '600' }, optionTextActive: { color: Colors.success }, applyButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: Colors.primary }, applyButtonText: { color: Colors.surface, fontWeight: '700' }, loading: { color: Colors.subtext, paddingVertical: 24, textAlign: 'center' }, error: { color: Colors.danger, lineHeight: 20 }, section: { gap: 8 }, heading: { color: Colors.text, fontSize: 19, fontWeight: '800' }, table: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 18, overflow: 'hidden' }, tableRow: { flexDirection: 'row', gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border }, rowLabel: { width: 76, color: Colors.subtext, fontSize: 13, lineHeight: 20 }, rowValue: { flex: 1, color: Colors.text, fontSize: 14, fontWeight: '600', lineHeight: 20 }, flexValue: { flex: 1, gap: 3 }, rowDetail: { color: Colors.subtext, fontSize: 13, lineHeight: 19 }, item: { color: Colors.text, fontSize: 15, lineHeight: 23 }, empty: { padding: 16, color: Colors.subtext, textAlign: 'center' }, aiResult: { borderRadius: 18, backgroundColor: Colors.peachSoft, padding: 16, gap: 8 }, aiResultTitle: { color: Colors.primary, fontWeight: '800' }, aiButton: { borderRadius: 16, borderWidth: 1, borderColor: Colors.primarySoft, backgroundColor: Colors.surfaceSoft, padding: 15, alignItems: 'center', gap: 3 }, disabledButton: { opacity: 0.6 }, aiButtonText: { color: Colors.primary, fontSize: 16, fontWeight: '800' }, aiButtonHint: { color: Colors.subtext, fontSize: 12 }, shareButton: { padding: 15, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center' }, shareButtonText: { color: Colors.surface, fontWeight: '800', fontSize: 16 }, disclaimer: { color: Colors.subtext, fontSize: 12, lineHeight: 18 },
});
