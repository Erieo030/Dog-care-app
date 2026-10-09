import type { VetBriefSection, VetVisitBrief } from '../../../services/aiService';
import {
  DAILY_LABELS,
  EVENT_LABELS,
  preVetAgeLabel,
  preVetDateLabel,
  preVetNeuteredLabel,
  preVetSexLabel,
  SEVERITY_LABELS,
  PRE_VET_SECTION_OPTIONS,
} from './preVetContent';

export interface VetOnePageRow {
  label: string;
  value: string;
}

const unknownValue = '未填寫';
const shortText = (value: string, limit = 100) =>
  value.length > limit ? `${value.slice(0, limit - 1)}…` : value;

/** 聚合敘述只有在來源類別與目前分享範圍一致時才可分享。 */
function hasMatchingSources(brief: VetVisitBrief, sections: VetBriefSection[]) {
  const supported = new Set<string>(PRE_VET_SECTION_OPTIONS.map((option) => option.key));
  const sources = [
    ...new Set(brief.sources.map((source) => source.type).filter((type) => supported.has(type))),
  ].sort();
  return sources.length > 0 && sources.join(',') === [...new Set(sections)].sort().join(',');
}

export function buildPreVetOnePageRows(
  brief: VetVisitBrief,
  sections: VetBriefSection[],
): VetOnePageRow[] {
  const rows: VetOnePageRow[] = [];
  const add = (label: string, value?: string | number | null) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      rows.push({ label, value: String(value) });
    }
  };

  if (sections.includes('health')) {
    const latest = brief.recentHealthEvents[0];
    const total = brief.dataCoverage.healthEvents ?? brief.recentHealthEvents.length;
    if (latest) {
      add(
        '近期狀況',
        `${preVetDateLabel(latest.occurredAt)} ${EVENT_LABELS[latest.type] || '健康紀錄'}：${shortText(latest.summary)}${latest.severity ? `（${SEVERITY_LABELS[latest.severity] || latest.severity}）` : ''}${total > 1 ? `，另有 ${total - 1} 筆` : ''}`,
      );
    } else {
      add('健康狀況', '所選期間沒有健康異常紀錄');
    }
  }

  if (sections.includes('weight')) {
    const points = [...brief.weightSummary.series].sort(
      (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime(),
    );
    const latestPoint = points.at(-1);
    const previousPoint = points.at(-2);
    const latest = brief.weightSummary.latestWeightKg ?? latestPoint?.weightKg;
    if (latest != null) {
      const change =
        brief.weightSummary.differenceKg ??
        (latestPoint && previousPoint ? latestPoint.weightKg - previousPoint.weightKg : undefined);
      add(
        '最近體重',
        `${latest} kg${latestPoint ? `・${preVetDateLabel(latestPoint.measuredAt)}` : ''}${change == null ? '' : change === 0 ? '（與前次相同）' : `（較前次${change > 0 ? '增加' : '減少'} ${Math.abs(change).toFixed(2)} kg）`}`,
      );
    } else {
      add('體重', '所選期間沒有體重紀錄');
    }
  }

  if (sections.includes('medications')) {
    add(
      '目前用藥',
      brief.activeMedications.length
        ? brief.activeMedications
            .slice(0, 3)
            .map((item) => item.name)
            .join('、') +
            (brief.activeMedications.length > 3
              ? `；另有 ${brief.activeMedications.length - 3} 項`
              : '')
        : '目前沒有進行中的用藥紀錄',
    );
  }

  if (sections.includes('medical')) {
    const visit = brief.recentMedicalVisits[0];
    add(
      '最近就醫',
      visit
        ? `${preVetDateLabel(visit.visitedAt)} ${visit.reason}${visit.clinicName ? `・${visit.clinicName}` : ''}`
        : '所選期間沒有就醫紀錄',
    );
  }

  if (sections.includes('daily')) {
    const daily = brief.dailyLogSummary;
    add(
      '日常觀察',
      daily.recordCount
        ? `喝水${DAILY_LABELS.water[daily.water?.latest || ''] || '未填寫'}・食量${DAILY_LABELS.food[daily.food?.latest || ''] || '未填寫'}・精神${DAILY_LABELS.energy[daily.energy?.latest || ''] || '未填寫'}・排便${DAILY_LABELS.stool[String(daily.stool?.latest || '')] || '未填寫'}`
        : '所選期間沒有日常紀錄',
    );
  }

  if (sections.includes('vaccinations')) {
    const vaccine = brief.vaccination.latest;
    add(
      '最近疫苗',
      vaccine
        ? `${vaccine.vaccineName || '疫苗'}・${preVetDateLabel(vaccine.administeredAt)}${vaccine.nextDueAt ? `・下次 ${preVetDateLabel(vaccine.nextDueAt)}` : ''}`
        : '目前沒有疫苗紀錄',
    );
  }

  if (sections.includes('dewormings')) {
    const deworming = brief.deworming.latest;
    add(
      '最近驅蟲',
      deworming
        ? `${deworming.productName || deworming.type || '驅蟲紀錄'}・${preVetDateLabel(deworming.administeredAt)}${deworming.nextDueAt ? `・下次 ${preVetDateLabel(deworming.nextDueAt)}` : ''}`
        : '目前沒有驅蟲紀錄',
    );
  }

  if (sections.includes('reminders')) {
    const next = brief.upcomingReminders[0];
    add(
      '待辦提醒',
      next ? `${preVetDateLabel(next.scheduledAt)} ${next.title}` : '目前沒有待辦提醒',
    );
  }

  return rows;
}

export function buildPreVetShareMessage(
  brief: VetVisitBrief,
  sections: VetBriefSection[],
  defaultPetName = '毛孩',
  visitConcern = '',
): string {
  const petName = brief.pet.name || defaultPetName;
  const lines = [
    `${petName} 看診摘要`,
    `資料期間：近 ${brief.period.days} 天`,
    `${preVetDateLabel(brief.period.startAt, true)} 至 ${preVetDateLabel(brief.period.endAt, true)}`,
    `基本資料：${brief.pet.breed || '品種未填寫'}・${preVetSexLabel(brief.pet.sex)}・${preVetAgeLabel(brief.pet.birthDate)}・${preVetNeuteredLabel(brief.pet.isNeutered)}`,
    `過敏：${brief.pet.allergies || unknownValue}`,
    `慢性病：${brief.pet.chronicDiseases || unknownValue}`,
  ];
  if (visitConcern.trim()) lines.push(`這次想詢問：${visitConcern.trim()}`);

  const summaryRows = buildPreVetOnePageRows(brief, sections);
  if (summaryRows.length) {
    lines.push('', '近期重點', ...summaryRows.map((row) => `• ${row.label}：${row.value}`));
  }

  const matchingSources = hasMatchingSources(brief, sections);
  if (brief.aiNarrative && matchingSources) {
    lines.push(
      '',
      `看診溝通整理（${brief.generationMode === 'llm' ? 'MEGO AI' : '系統整理，非 AI'}）`,
      shortText(brief.aiNarrative.overview, 260),
    );
    if (brief.aiNarrative.questions.length) {
      lines.push(
        '可向獸醫確認',
        ...brief.aiNarrative.questions.slice(0, 2).map((item) => `• ${shortText(item, 120)}`),
      );
    }
  } else if (matchingSources && brief.vetQuestions.length) {
    lines.push(
      '',
      '可向獸醫確認',
      ...brief.vetQuestions.slice(0, 2).map((item) => `• ${shortText(item, 120)}`),
    );
  }

  lines.push('', '完整照護紀錄可於 MEGO 查看。', brief.disclaimer);
  return lines.join('\n');
}
