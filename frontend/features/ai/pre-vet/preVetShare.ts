import type { VetBriefSection, VetVisitBrief } from '../../../services/aiService';
import {
  DAILY_LABELS,
  EVENT_LABELS,
  preVetAgeLabel,
  preVetDateLabel,
  preVetSexLabel,
  SEVERITY_LABELS,
} from './preVetContent';

export function buildPreVetShareMessage(
  brief: VetVisitBrief,
  sections: VetBriefSection[],
  defaultPetName = '毛孩',
): string {
  const lines = [
    `${brief.pet.name || defaultPetName} 就醫前摘要`,
    `資料範圍：近 ${brief.period.days} 天`,
    `基本資料：${brief.pet.breed || '品種未填寫'}・${preVetSexLabel(brief.pet.sex)}・${preVetAgeLabel(brief.pet.birthDate)}・${brief.pet.isNeutered ? '已結紮' : '未結紮'}`,
    `過敏資訊：${brief.pet.allergies || '無／未填寫'}`,
    `慢性病：${brief.pet.chronicDiseases || '無／未填寫'}`,
  ];
  const addSection = (title: string, items: string[]) => {
    lines.push('', title, ...(items.length ? items.map((item) => `• ${item}`) : ['• 此期間沒有相關紀錄']));
  };

  if (sections.includes('health')) {
    addSection(
      '健康異常',
      brief.recentHealthEvents.map(
        (item) =>
          `${preVetDateLabel(item.occurredAt)} ${EVENT_LABELS[item.type] || '健康異常'}／${SEVERITY_LABELS[item.severity] || item.severity}：${item.summary}${item.notes ? `；${item.notes}` : ''}`,
      ),
    );
  }
  if (sections.includes('weight')) {
    addSection(
      '體重趨勢',
      brief.weightSummary.series.map(
        (item) => `${preVetDateLabel(item.measuredAt)} ${item.weightKg} kg`,
      ),
    );
  }
  if (sections.includes('daily')) {
    const daily = brief.dailyLogSummary;
    addSection(
      '日常觀察',
      daily.recordCount
        ? [
            `共 ${daily.recordCount} 筆紀錄`,
            `最新狀況：喝水 ${DAILY_LABELS.water[daily.water?.latest || ''] || '未填寫'}、食量 ${DAILY_LABELS.food[daily.food?.latest || ''] || '未填寫'}、精神 ${DAILY_LABELS.energy[daily.energy?.latest || ''] || '未填寫'}、排便 ${DAILY_LABELS.stool[String(daily.stool?.latest || '')] || '未填寫'}`,
          ]
        : [],
    );
  }
  if (sections.includes('medications')) {
    addSection(
      '目前用藥',
      brief.activeMedications.map(
        (item) => `${item.name}：${item.instructions || '依醫囑使用'}`,
      ),
    );
  }
  if (sections.includes('medical')) {
    addSection(
      '近期就醫',
      brief.recentMedicalVisits.map(
        (item) =>
          `${preVetDateLabel(item.visitedAt)} ${item.reason}${item.clinicName ? `／${item.clinicName}` : ''}${item.treatmentNotes ? `；${item.treatmentNotes}` : ''}`,
      ),
    );
  }
  if (sections.includes('vaccinations')) {
    const item = brief.vaccination.latest;
    addSection(
      '疫苗',
      item
        ? [`${item.vaccineName || '疫苗名稱未填寫'}；接種 ${preVetDateLabel(item.administeredAt)}${item.nextDueAt ? `；下次 ${preVetDateLabel(item.nextDueAt)}` : ''}`]
        : [],
    );
  }
  if (sections.includes('dewormings')) {
    const item = brief.deworming.latest;
    addSection(
      '驅蟲',
      item
        ? [`${item.productName || item.type || '品項未填寫'}；使用 ${preVetDateLabel(item.administeredAt)}${item.nextDueAt ? `；下次 ${preVetDateLabel(item.nextDueAt)}` : ''}`]
        : [],
    );
  }
  if (sections.includes('reminders')) {
    addSection(
      '待辦提醒',
      brief.upcomingReminders.map(
        (item) => `${preVetDateLabel(item.scheduledAt)} ${item.title}`,
      ),
    );
  }

  if (brief.aiNarrative) {
    lines.push('', '看診溝通重點', brief.aiNarrative.overview);
    if (brief.aiNarrative.timeline.length) {
      lines.push('', '近期紀錄脈絡', ...brief.aiNarrative.timeline.map((item) => `• ${item}`));
    }
    if (brief.aiNarrative.dataGaps.length) {
      lines.push('', '可再補充的資訊', ...brief.aiNarrative.dataGaps.map((item) => `• ${item}`));
    }
  }

  const questions = brief.aiNarrative?.questions.length
    ? brief.aiNarrative.questions
    : brief.vetQuestions;
  addSection('可向獸醫確認', questions);
  lines.push('', brief.disclaimer);
  return lines.join('\n');
}
