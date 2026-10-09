import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, View } from 'react-native';

import {
  preVetAgeLabel,
  preVetDateLabel,
  preVetSexLabel,
  preVetNeuteredLabel,
} from '../preVetContent';
import { buildPreVetOnePageRows } from '../preVetOnePage';
import type { VetBriefSection, VetVisitBrief } from '../../../../services/aiService';
import { preVetStyles as styles } from '../preVetStyles';

interface Props {
  brief: VetVisitBrief;
  sections: VetBriefSection[];
  visitConcern: string;
  onChangeVisitConcern: (value: string) => void;
}

export function PreVetOnePageCard({ brief, sections, visitConcern, onChangeVisitConcern }: Props) {
  const rows = buildPreVetOnePageRows(brief, sections);
  const petName = brief.pet.name || '毛孩';

  return (
    <View style={styles.onePageCard}>
      <View style={styles.onePageHeader}>
        <View style={styles.onePageIcon}>
          <Ionicons name="document-text-outline" size={20} color="#FFF" />
        </View>
        <View style={styles.onePageHeaderCopy}>
          <Text style={styles.onePageTitle}>看診快速摘要</Text>
          <Text style={styles.onePageMeta}>
            近 {brief.period.days} 天・{petName}
          </Text>
        </View>
        <Ionicons name="paw-outline" size={20} color="#B8754D" />
      </View>

      <Text style={styles.onePageProfile}>
        {[
          brief.pet.breed || '品種未填寫',
          preVetSexLabel(brief.pet.sex),
          preVetAgeLabel(brief.pet.birthDate),
          preVetNeuteredLabel(brief.pet.isNeutered),
        ].join('・')}
      </Text>

      <View style={styles.onePageMedicalInfo}>
        <View style={styles.onePageMedicalRow}>
          <Text style={styles.onePageMedicalLabel}>過敏</Text>
          <Text style={styles.onePageMedicalValue}>{brief.pet.allergies || '未填寫'}</Text>
        </View>
        <View style={styles.onePageMedicalRow}>
          <Text style={styles.onePageMedicalLabel}>慢性病</Text>
          <Text style={styles.onePageMedicalValue}>{brief.pet.chronicDiseases || '未填寫'}</Text>
        </View>
      </View>

      <View style={styles.visitConcernGroup}>
        <Text style={styles.onePageSectionTitle}>這次想詢問獸醫（選填）</Text>
        <TextInput
          accessibilityLabel="這次想詢問獸醫"
          value={visitConcern}
          onChangeText={onChangeVisitConcern}
          placeholder="例如：最近食慾變差，想確認是否需要檢查"
          placeholderTextColor="#91877F"
          maxLength={150}
          multiline
          textAlignVertical="top"
          style={styles.visitConcernInput}
        />
      </View>

      <View style={styles.onePageRows}>
        <Text style={styles.onePageSectionTitle}>近期重點</Text>
        {rows.length ? (
          rows.map((row, index) => (
            <View key={`${row.label}-${index}`} style={styles.onePageRow}>
              <Text style={styles.onePageRowLabel}>{row.label}</Text>
              <Text style={styles.onePageRowValue}>{row.value}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.onePageEmpty}>所選資料目前沒有可列出的近期重點。</Text>
        )}
      </View>

      <Text style={styles.onePageFootnote}>
        摘要依已記錄資料整理，供看診溝通參考；不代表診斷。資料期間：
        {preVetDateLabel(brief.period.startAt, true)} 至 {preVetDateLabel(brief.period.endAt, true)}
      </Text>
    </View>
  );
}
