/** 用途：建立可分享的規則式飼主就醫摘要與共用顯示文字。 */
import { MedicalVisit, Pet } from '../types';
export const MEAL_TIMING_LABELS = { before: '飯前', after: '飯後', any: '不限' } as const;
export const FOLLOW_UP_STATUS_LABELS: Record<string, string> = {
  pending: '已建立',
  snoozed: '已延後',
  completed: '已完成',
  skipped: '已略過',
};
const date = (value: string) => new Date(value).toLocaleDateString('zh-TW');
export const buildMedicalVisitShareText = (pet: Pet, visit: MedicalVisit) => {
  const lines = [`${pet.name}的飼主就醫摘要`, `就醫日期：${date(visit.visitedAt)}`];
  if (visit.clinicName) lines.push(`動物醫院：${visit.clinicName}`);
  lines.push(`看診原因：${visit.reason}`);
  if (visit.veterinarianNotes) lines.push(`獸醫說明：${visit.veterinarianNotes}`);
  if (visit.treatmentNotes) lines.push(`治療內容：${visit.treatmentNotes}`);
  if (visit.medications?.length) {
    lines.push('藥物：');
    visit.medications.forEach((m) =>
      lines.push(
        `- ${m.name}${m.instructions ? `：${m.instructions}` : ''}，每日 ${m.timesPerDay} 次，${MEAL_TIMING_LABELS[m.mealTiming]}`,
      ),
    );
  }
  if (visit.followUpAt) lines.push(`下次回診：${date(visit.followUpAt)}`);
  if (visit.notes) lines.push(`備註：${visit.notes}`);
  lines.push('', '此內容為飼主自行整理的紀錄，並非動物醫院正式病歷或診斷證明。');
  return lines.join('\n');
};
