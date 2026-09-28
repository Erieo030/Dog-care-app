import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import WeightTrendChart from '../../../../components/dashboard/WeightTrendChart';
import type { DashboardWeightPoint } from '../../../../types';
import type { VetVisitBrief } from '../../../../services/aiService';
import { DAILY_LABELS, EVENT_LABELS, preVetDateLabel, SEVERITY_LABELS } from '../preVetContent';
import { preVetStyles as styles } from '../preVetStyles';

export function PreVetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      <View style={styles.table}>{children}</View>
    </View>
  );
}

export function PreVetTableRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tableRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function PreVetHealthTable({ items }: { items: VetVisitBrief['recentHealthEvents'] }) {
  return items.length ? (
    <>
      {items.map((item) => (
        <View key={item.id} style={styles.tableRow}>
          <Text style={styles.rowLabel}>{preVetDateLabel(item.occurredAt)}</Text>
          <View style={styles.flexValue}>
            <Text style={styles.rowValue}>
              {EVENT_LABELS[item.type] || '健康異常'}・
              {SEVERITY_LABELS[item.severity] || item.severity}
            </Text>
            <Text style={styles.rowDetail}>
              {item.summary}
              {item.notes ? `：${item.notes}` : ''}
            </Text>
          </View>
        </View>
      ))}
    </>
  ) : (
    <PreVetEmpty text="此期間沒有健康異常紀錄" />
  );
}

export function PreVetMedicationTable({ items }: { items: VetVisitBrief['activeMedications'] }) {
  return items.length ? (
    <>
      {items.map((item, index) => (
        <View key={`${item.name}-${index}`} style={styles.tableRow}>
          <Text style={styles.rowLabel}>{item.name}</Text>
          <View style={styles.flexValue}>
            <Text style={styles.rowValue}>{item.instructions || '依醫囑使用'}</Text>
            <Text style={styles.rowDetail}>
              {item.startDate ? `開始：${item.startDate}` : '開始日期未填寫'}
              {item.timesPerDay ? `・每日 ${item.timesPerDay} 次` : ''}
            </Text>
          </View>
        </View>
      ))}
    </>
  ) : (
    <PreVetEmpty text="目前沒有進行中的用藥紀錄" />
  );
}

export function PreVetMedicalTable({ items }: { items: VetVisitBrief['recentMedicalVisits'] }) {
  return items.length ? (
    <>
      {items.map((item) => (
        <View key={item.id} style={styles.tableRow}>
          <Text style={styles.rowLabel}>{preVetDateLabel(item.visitedAt)}</Text>
          <View style={styles.flexValue}>
            <Text style={styles.rowValue}>{item.reason}</Text>
            <Text style={styles.rowDetail}>
              {[item.clinicName, item.treatmentNotes].filter(Boolean).join('・') ||
                '未補充治療說明'}
            </Text>
          </View>
        </View>
      ))}
    </>
  ) : (
    <PreVetEmpty text="尚無近期就醫紀錄" />
  );
}

export function PreVetReminderTable({ items }: { items: VetVisitBrief['upcomingReminders'] }) {
  return items.length ? (
    <>
      {items.map((item, index) => (
        <PreVetTableRow
          key={`${item.title}-${index}`}
          label={preVetDateLabel(item.scheduledAt)}
          value={item.title}
        />
      ))}
    </>
  ) : (
    <PreVetEmpty text="目前沒有待辦提醒" />
  );
}

export function PreVetDailySummary({ brief }: { brief: VetVisitBrief }) {
  const summary = brief.dailyLogSummary;
  return (
    <>
      <PreVetTableRow label="日常筆數" value={`${summary.recordCount} 筆`} />
      <PreVetTableRow
        label="最新狀況"
        value={`喝水 ${DAILY_LABELS.water[summary.water?.latest || ''] || '未填寫'}・食量 ${DAILY_LABELS.food[summary.food?.latest || ''] || '未填寫'}・精神 ${DAILY_LABELS.energy[summary.energy?.latest || ''] || '未填寫'}・排便 ${DAILY_LABELS.stool[String(summary.stool?.latest || '')] || '未填寫'}`}
      />
    </>
  );
}

export function PreVetLatestCare({
  label,
  value,
  date,
  due,
}: {
  label: string;
  value?: string;
  date?: string;
  due?: string;
}) {
  return value ? (
    <>
      <PreVetTableRow label={label} value={value} />
      <PreVetTableRow label="使用日期" value={preVetDateLabel(date)} />
      {due && <PreVetTableRow label="下次日期" value={preVetDateLabel(due)} />}
    </>
  ) : (
    <PreVetEmpty text="尚無相關紀錄" />
  );
}

export function PreVetWeightSummary({
  brief,
  points,
}: {
  brief: VetVisitBrief;
  points: DashboardWeightPoint[];
}) {
  const difference = brief.weightSummary.differenceKg;
  return (
    <>
      <PreVetTableRow
        label="最新體重"
        value={
          brief.weightSummary.latestWeightKg != null
            ? `${brief.weightSummary.latestWeightKg} kg`
            : '未記錄'
        }
      />
      {difference != null && (
        <PreVetTableRow
          label="最近變化"
          value={`${difference > 0 ? '+' : ''}${difference.toFixed(2)} kg`}
        />
      )}
      {points.length > 1 ? (
        <WeightTrendChart items={points} />
      ) : (
        <PreVetEmpty text="至少需要兩筆體重紀錄才能顯示趨勢" />
      )}
    </>
  );
}

export function PreVetQuestions({ items }: { items: string[] }) {
  return items.length ? (
    <>
      {items.map((item, index) => (
        <View key={`${item}-${index}`} style={styles.questionRow}>
          <View style={styles.questionIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={15} color="#5F9274" />
          </View>
          <Text style={styles.questionText}>{item}</Text>
        </View>
      ))}
    </>
  ) : (
    <PreVetEmpty text="看診時可向獸醫確認毛孩接下來的觀察重點。" />
  );
}

export function PreVetEmpty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}
