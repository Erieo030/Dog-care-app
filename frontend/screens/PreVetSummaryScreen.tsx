import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, SafeAreaView, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { Colors } from '../constants/Colors';
import { getVetVisitBrief, VetBriefSection, VetVisitBrief } from '../services/aiService';
import { DashboardWeightPoint } from '../types';
import {
  PreVetDailySummary as DailySummary,
  PreVetHealthTable as HealthTable,
  PreVetLatestCare as LatestCare,
  PreVetMedicalTable as MedicalTable,
  PreVetMedicationTable as MedicationTable,
  PreVetQuestions as Questions,
  PreVetReminderTable as ReminderTable,
  PreVetSection as Section,
  PreVetTableRow as TableRow,
  PreVetWeightSummary as WeightSummary,
} from '../features/ai/pre-vet/components/PreVetBriefSections';
import { preVetStyles as styles } from '../features/ai/pre-vet/preVetStyles';
import { PreVetNarrativeCard } from '../features/ai/pre-vet/components/PreVetNarrativeCard';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import {
  DEFAULT_PRE_VET_SECTIONS,
  PRE_VET_RANGES,
  PRE_VET_SECTION_OPTIONS,
  preVetAgeLabel,
  preVetSexLabel,
} from '../features/ai/pre-vet/preVetContent';
import { buildPreVetShareMessage } from '../features/ai/pre-vet/preVetShare';

export default function PreVetSummaryScreen() {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [range, setRange] = useState<(typeof PRE_VET_RANGES)[number]>(7);
  const [draftSections, setDraftSections] = useState<VetBriefSection[]>(DEFAULT_PRE_VET_SECTIONS);
  const [appliedSections, setAppliedSections] =
    useState<VetBriefSection[]>(DEFAULT_PRE_VET_SECTIONS);
  const [brief, setBrief] = useState<VetVisitBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeToolsExpanded, setNarrativeToolsExpanded] = useState(false);
  const [error, setError] = useState('');
  const [narrativeError, setNarrativeError] = useState('');
  const appliedKey = appliedSections.join(',');
  const draftChanged = draftSections.join(',') !== appliedKey;

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!session?.userId || !selectedPet?.id) return;
    setLoading(true);
    setError('');
    setNarrativeError('');
    try {
      setBrief(
        await getVetVisitBrief(session.userId, selectedPet.id, range, false, appliedSections, signal),
      );
    } catch (caught) {
      if (signal?.aborted) return;
      setBrief(null);
      setError((caught as Error).message || '摘要載入失敗');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [appliedSections, range, selectedPet?.id, session?.userId]);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void load(controller.signal);
      return () => controller.abort();
    }, [load]),
  );

  const toggleSection = (section: VetBriefSection) => {
    setDraftSections((current) =>
      current.includes(section)
        ? current.filter((value) => value !== section)
        : [...current, section],
    );
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
      setBrief(
        await getVetVisitBrief(session.userId, selectedPet.id, range, true, appliedSections),
      );
    } catch (caught) {
      setNarrativeError((caught as Error).message || '整理未完成；上方原始照護紀錄仍可查看與分享。');
    } finally {
      setNarrativeLoading(false);
    }
  }, [appliedSections, narrativeLoading, range, selectedPet?.id, session?.userId]);

  const weightPoints = useMemo<DashboardWeightPoint[]>(
    () =>
      (brief?.weightSummary.series || []).map((item, index) => ({
        id: `${item.measuredAt}-${index}`,
        measuredAt: item.measuredAt,
        weightKg: item.weightKg,
      })),
    [brief?.weightSummary.series],
  );

  const share = async () => {
    if (!brief) return;
    try {
      await Share.share({
        message: buildPreVetShareMessage(brief, appliedSections, selectedPet?.name),
      });
    } catch (caught) {
      Alert.alert('分享失敗', (caught as Error).message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.title}>就醫前摘要</Text>
          <Text style={styles.subtitle}>選擇要帶去看診的資料，整理成容易閱讀的重點。</Text>
        </View>

        <View style={styles.rangeRow}>
          {PRE_VET_RANGES.map((value) => (
            <TouchableOpacity
              key={value}
              accessibilityRole="button"
              style={[styles.chip, range === value && styles.activeChip]}
              onPress={() => setRange(value)}
            >
              <Text style={[styles.chipText, range === value && styles.activeChipText]}>
                近 {value} 天
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.selector}>
          <Text style={styles.selectorTitle}>選擇要帶入的資料</Text>
          <Text style={styles.selectorHint}>未選取資料不會顯示、分享或提供給 AI。</Text>
          <View style={styles.optionWrap}>
            {PRE_VET_SECTION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: draftSections.includes(option.key) }}
                style={[styles.option, draftSections.includes(option.key) && styles.optionActive]}
                onPress={() => toggleSection(option.key)}
              >
                <Text
                  style={[
                    styles.optionText,
                    draftSections.includes(option.key) && styles.optionTextActive,
                  ]}
                >
                  {draftSections.includes(option.key) ? '✓ ' : ''}
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {draftChanged && (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.applyButton}
              onPress={applySections}
            >
              <Text style={styles.applyButtonText}>更新摘要</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && <Text style={styles.loading}>正在整理已選擇的照護資料…</Text>}
        {!!error && <Text style={styles.error}>{error}</Text>}

        {!!brief && !loading && (
          <>
            <Section title="毛孩基本資料">
              <TableRow
                label="基本資訊"
                value={`${brief.pet.breed || '品種未填寫'}・${preVetSexLabel(brief.pet.sex)}・${preVetAgeLabel(brief.pet.birthDate)}・${brief.pet.isNeutered ? '已結紮' : '未結紮'}`}
              />
              <TableRow label="過敏資訊" value={brief.pet.allergies || '無／未填寫'} />
              <TableRow label="慢性病" value={brief.pet.chronicDiseases || '無／未填寫'} />
            </Section>

            {appliedSections.includes('health') && (
              <Section title="健康異常">
                <HealthTable items={brief.recentHealthEvents} />
              </Section>
            )}
            {appliedSections.includes('weight') && (
              <Section title="體重趨勢">
                <WeightSummary brief={brief} points={weightPoints} />
              </Section>
            )}
            {appliedSections.includes('medications') && (
              <Section title="目前用藥">
                <MedicationTable items={brief.activeMedications} />
              </Section>
            )}
            {appliedSections.includes('medical') && (
              <Section title="近期就醫">
                <MedicalTable items={brief.recentMedicalVisits} />
              </Section>
            )}
            {appliedSections.includes('daily') && (
              <Section title="日常觀察">
                <DailySummary brief={brief} />
              </Section>
            )}
            {appliedSections.includes('vaccinations') && (
              <Section title="疫苗">
                <LatestCare
                  label="最近接種"
                  value={brief.vaccination.latest?.vaccineName}
                  date={brief.vaccination.latest?.administeredAt}
                  due={brief.vaccination.latest?.nextDueAt}
                />
              </Section>
            )}
            {appliedSections.includes('dewormings') && (
              <Section title="驅蟲">
                <LatestCare
                  label="最近使用"
                  value={brief.deworming.latest?.productName}
                  date={brief.deworming.latest?.administeredAt}
                  due={brief.deworming.latest?.nextDueAt}
                />
              </Section>
            )}
            {appliedSections.includes('reminders') && (
              <Section title="待辦提醒">
                <ReminderTable items={brief.upcomingReminders} />
              </Section>
            )}

            {brief.aiNarrative ? (
              <PreVetNarrativeCard
                narrative={brief.aiNarrative}
                periodDays={brief.period.days}
                generatedByAI={brief.generationMode === 'llm'}
              />
            ) : (
              <>
                <View style={styles.sourceNotice}>
                  <Text style={styles.sourceNoticeTitle}>系統整理（非 AI）</Text>
                  <Text style={styles.sourceNoticeText}>
                    {narrativeError
                      ? 'AI 整理暫時未完成；以下所選原始紀錄仍可查看及分享。'
                      : '以下為依已記錄資料整理的內容；所選原始紀錄仍可查看及分享。'}
                  </Text>
                </View>
                <Section title="看診時可以詢問">
                  <Questions items={brief.vetQuestions} />
                </Section>
              </>
            )}
            <View style={styles.aiGroup}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="看診溝通重點整理工具"
                accessibilityState={{ expanded: narrativeToolsExpanded }}
                style={styles.aiDisclosure}
                onPress={() => setNarrativeToolsExpanded((expanded) => !expanded)}
              >
                <View style={styles.aiDisclosureContent}>
                  <Text style={styles.aiDisclosureTitle}>
                    {brief.aiNarrative ? '重新整理看診溝通重點' : '整理成看診溝通重點'}
                  </Text>
                  <Text style={styles.aiDisclosureHint}>選用功能・不會自動呼叫 AI</Text>
                </View>
                <Ionicons
                  name={narrativeToolsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={19}
                  color={Colors.subtext}
                />
              </TouchableOpacity>
              {narrativeToolsExpanded && (
                <View style={styles.aiTool}>
                  <Text style={styles.aiToolDescription}>
                    按下後，MEGO AI 會依勾選項目與毛孩基本資料整理重點；健康異常、日常與體重依所選天數整理，其他已選項目則提供目前或最近的照護資訊。未勾選的紀錄不會提供給 AI。內容僅供溝通參考，不作診斷或用藥建議。
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="產生看診溝通重點"
                    disabled={narrativeLoading}
                    style={[styles.aiButton, narrativeLoading && styles.disabledButton]}
                    onPress={enhanceWithAI}
                  >
                    <Text style={styles.aiButtonText}>
                      {narrativeLoading ? '正在整理所選紀錄…' : brief.aiNarrative ? '重新整理' : '產生溝通重點'}
                    </Text>
                    <Text style={styles.aiButtonHint}>會整理時間脈絡、獸醫確認問題與明確缺漏</Text>
                  </TouchableOpacity>
                  {!!narrativeError && <Text style={styles.error}>{narrativeError}</Text>}
                </View>
              )}
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="分享就醫前摘要"
              style={styles.shareButton}
              onPress={share}
            >
              <Text style={styles.shareButtonText}>分享摘要</Text>
            </TouchableOpacity>
            <Text style={styles.disclaimer}>{brief.disclaimer}</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
