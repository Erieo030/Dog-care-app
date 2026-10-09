import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Share, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { Colors } from '../constants/Colors';
import type { RootStackParamList } from '../navigation/types';
import { VetBriefSection } from '../services/aiService';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { usePreVetBrief } from '../features/ai/pre-vet/usePreVetBrief';
import { DashboardWeightPoint } from '../types';
import {
  PreVetDailySummary as DailySummary,
  PreVetHealthTable as HealthTable,
  PreVetLatestCare as LatestCare,
  PreVetMedicalTable as MedicalTable,
  PreVetMedicationTable as MedicationTable,
  PreVetReminderTable as ReminderTable,
  PreVetSection as Section,
  PreVetTableRow as TableRow,
  PreVetWeightSummary as WeightSummary,
} from '../features/ai/pre-vet/components/PreVetBriefSections';
import { preVetStyles as styles } from '../features/ai/pre-vet/preVetStyles';
import { PreVetNarrativeCard } from '../features/ai/pre-vet/components/PreVetNarrativeCard';
import {
  DEFAULT_PRE_VET_SECTIONS,
  PRE_VET_RANGES,
  PRE_VET_SECTION_OPTIONS,
  preVetAgeLabel,
  preVetNeuteredLabel,
  preVetSexLabel,
} from '../features/ai/pre-vet/preVetContent';
import { buildPreVetShareMessage } from '../features/ai/pre-vet/preVetShare';
import { PreVetOnePageCard } from '../features/ai/pre-vet/components/PreVetOnePageCard';

type Props = NativeStackScreenProps<RootStackParamList, 'VetVisitBrief'>;

export default function PreVetSummaryScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [range, setRange] = useState<(typeof PRE_VET_RANGES)[number]>(7);
  const [draftSections, setDraftSections] = useState<VetBriefSection[]>(DEFAULT_PRE_VET_SECTIONS);
  const [appliedSections, setAppliedSections] =
    useState<VetBriefSection[]>(DEFAULT_PRE_VET_SECTIONS);
  const [narrativeToolsExpanded, setNarrativeToolsExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [narrativeExpanded, setNarrativeExpanded] = useState(false);
  const [visitConcern, setVisitConcern] = useState('');
  const { brief, loading, narrativeLoading, error, narrativeError, enhanceWithAI, retry } =
    usePreVetBrief(session?.userId, selectedPet?.id, range, appliedSections);
  const appliedKey = appliedSections.join(',');
  const draftChanged = draftSections.join(',') !== appliedKey;

  useEffect(() => {
    setVisitConcern('');
    setDetailsExpanded(false);
    setNarrativeExpanded(false);
  }, [selectedPet?.id, session?.userId]);

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
        message: buildPreVetShareMessage(brief, appliedSections, selectedPet?.name, visitConcern),
      });
    } catch (caught) {
      Alert.alert('分享失敗', (caught as Error).message);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.pageHeader}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="返回 MEGO AI 對話"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={23} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.pageHeaderCopy}>
          <Text style={styles.title}>就醫前摘要</Text>
          <Text style={styles.subtitle}>先看一頁近期重點，需要時再展開完整紀錄。</Text>
        </View>
      </View>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        bottomOffset={24}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <Text style={styles.loading}>
            {brief ? '正在更新摘要…' : '正在整理已選擇的照護資料…'}
          </Text>
        )}
        {!!error && (
          <View style={styles.sourceNotice}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="重新載入就醫前摘要"
              style={styles.applyButton}
              onPress={retry}
            >
              <Text style={styles.applyButtonText}>重新載入</Text>
            </TouchableOpacity>
          </View>
        )}

        {!!brief && (
          <>
            <PreVetOnePageCard
              brief={brief}
              sections={appliedSections}
              visitConcern={visitConcern}
              onChangeVisitConcern={setVisitConcern}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="分享看診摘要文字"
              style={styles.shareButton}
              onPress={share}
            >
              <Text style={styles.shareButtonText}>分享摘要文字</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: settingsExpanded }}
              style={styles.disclosure}
              onPress={() => setSettingsExpanded((expanded) => !expanded)}
            >
              <View style={styles.disclosureCopy}>
                <Text style={styles.disclosureTitle}>摘要範圍</Text>
                <Text style={styles.disclosureHint}>
                  近 {range} 天・已選 {appliedSections.length} 類資料
                </Text>
              </View>
              <Ionicons
                name={settingsExpanded ? 'chevron-up' : 'chevron-down'}
                size={19}
                color={Colors.subtext}
              />
            </TouchableOpacity>
            {settingsExpanded && (
              <View style={styles.selector}>
                <Text style={styles.selectorTitle}>選擇資料期間</Text>
                <View style={styles.rangeRow}>
                  {PRE_VET_RANGES.map((value) => (
                    <TouchableOpacity
                      key={value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: range === value }}
                      style={[styles.chip, range === value && styles.activeChip]}
                      onPress={() => setRange(value)}
                    >
                      <Text style={[styles.chipText, range === value && styles.activeChipText]}>
                        近 {value} 天
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.selectorTitle}>選擇要帶入的資料</Text>
                <Text style={styles.selectorHint}>
                  未選取資料不會出現在摘要、分享或 AI 整理中。
                </Text>
                <View style={styles.optionWrap}>
                  {PRE_VET_SECTION_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: draftSections.includes(option.key) }}
                      style={[
                        styles.option,
                        draftSections.includes(option.key) && styles.optionActive,
                      ]}
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
            )}

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: narrativeExpanded }}
              style={styles.disclosure}
              onPress={() => setNarrativeExpanded((expanded) => !expanded)}
            >
              <View style={styles.disclosureCopy}>
                <Text style={styles.disclosureTitle}>看診溝通整理</Text>
                <Text style={styles.disclosureHint}>
                  {brief.aiNarrative ? '已整理，可查看完整內容' : '選用功能・依所選紀錄整理'}
                </Text>
              </View>
              <Ionicons
                name={narrativeExpanded ? 'chevron-up' : 'chevron-down'}
                size={19}
                color={Colors.subtext}
              />
            </TouchableOpacity>
            {narrativeExpanded && (
              <View style={styles.disclosureBody}>
                {brief.aiNarrative ? (
                  <PreVetNarrativeCard
                    narrative={brief.aiNarrative}
                    periodDays={brief.period.days}
                    generatedByAI={brief.generationMode === 'llm'}
                  />
                ) : (
                  <View style={styles.sourceNotice}>
                    <Text style={styles.sourceNoticeTitle}>系統整理（非 AI）</Text>
                    <Text style={styles.sourceNoticeText}>
                      一頁摘要依已記錄資料產生，不會在進入頁面時呼叫 AI。
                    </Text>
                  </View>
                )}
                {!!narrativeError && <Text style={styles.error}>{narrativeError}</Text>}
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
                        {brief.aiNarrative ? '重新整理看診溝通重點' : '使用 MEGO AI 整理'}
                      </Text>
                      <Text style={styles.aiDisclosureHint}>AI 會讀取已選資料，仍需飼主同意</Text>
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
                        AI
                        會整理時間脈絡、獸醫確認問題與明確資料缺漏。未勾選的紀錄不會送出；內容僅供看診溝通參考，不作診斷或用藥建議。
                      </Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="產生看診溝通重點"
                        disabled={narrativeLoading}
                        style={[styles.aiButton, narrativeLoading && styles.disabledButton]}
                        onPress={enhanceWithAI}
                      >
                        <Text style={styles.aiButtonText}>
                          {narrativeLoading
                            ? '正在整理所選紀錄…'
                            : brief.aiNarrative
                              ? '重新整理'
                              : '產生溝通重點'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: detailsExpanded }}
              style={styles.disclosure}
              onPress={() => setDetailsExpanded((expanded) => !expanded)}
            >
              <View style={styles.disclosureCopy}>
                <Text style={styles.disclosureTitle}>查看所選原始紀錄</Text>
                <Text style={styles.disclosureHint}>需要時再展開明細表格與完整脈絡</Text>
              </View>
              <Ionicons
                name={detailsExpanded ? 'chevron-up' : 'chevron-down'}
                size={19}
                color={Colors.subtext}
              />
            </TouchableOpacity>
            {detailsExpanded && (
              <View style={styles.disclosureBody}>
                <Section title="毛孩基本資料">
                  <TableRow
                    label="基本資訊"
                    value={`${brief.pet.breed || '品種未填寫'}・${preVetSexLabel(brief.pet.sex)}・${preVetAgeLabel(brief.pet.birthDate)}・${preVetNeuteredLabel(brief.pet.isNeutered)}`}
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

                <Text style={styles.disclaimer}>{brief.disclaimer}</Text>
              </View>
            )}
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
