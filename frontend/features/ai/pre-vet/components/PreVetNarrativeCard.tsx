/** 用途：以輕量分段呈現獸醫溝通摘要，並標示是否由 AI 生成。 */
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, StyleSheet } from 'react-native';
import { Colors } from '../../../../constants/Colors';
import type { VetNarrative } from '../../../../services/aiService';

interface Props {
  narrative: VetNarrative;
  periodDays: number;
  generatedByAI: boolean;
}

export function PreVetNarrativeCard({ narrative, periodDays, generatedByAI }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="chatbox-ellipses-outline" size={20} color={Colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>看診溝通重點</Text>
          <Text style={styles.meta}>
            近 {periodDays} 天趨勢・{generatedByAI ? 'MEGO AI 整理' : '系統整理（非 AI）'}
          </Text>
        </View>
      </View>

      <Text style={styles.overview}>{narrative.overview}</Text>

      {!!narrative.timeline.length && (
        <NarrativeList title="近期紀錄脈絡" icon="time-outline" items={narrative.timeline} />
      )}
      {!!narrative.questions.length && (
        <NarrativeList title="可向獸醫確認" icon="help-circle-outline" items={narrative.questions} />
      )}
      {!!narrative.dataGaps.length && (
        <View style={styles.gapNotice}>
          <Text style={styles.gapTitle}>可再補充的資訊</Text>
          {narrative.dataGaps.map((item, index) => (
            <Text key={`${index}-${item}`} style={styles.gapText}>• {item}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

function NarrativeList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  items: string[];
}) {
  return (
    <View style={styles.listSection}>
      <View style={styles.sectionHeading}>
        <Ionicons name={icon} size={16} color={Colors.success} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {items.map((item, index) => (
        <View key={`${index}-${item}`} style={styles.listItem}>
          <View style={styles.bullet} />
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSoft,
    padding: 16,
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.peachSoft,
  },
  headerText: { flex: 1 },
  title: { color: Colors.text, fontSize: 16, fontWeight: '800' },
  meta: { color: Colors.subtext, fontSize: 12, marginTop: 3 },
  overview: { color: Colors.text, fontSize: 15, lineHeight: 23 },
  listSection: { gap: 8 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: Colors.success, fontSize: 13, fontWeight: '800' },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingLeft: 2 },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 8 },
  listText: { flex: 1, color: Colors.text, fontSize: 14, lineHeight: 21 },
  gapNotice: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, paddingTop: 11, gap: 4 },
  gapTitle: { color: Colors.subtext, fontSize: 12, fontWeight: '800', marginBottom: 2 },
  gapText: { color: Colors.subtext, fontSize: 13, lineHeight: 19 },
});
