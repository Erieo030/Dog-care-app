import { FOLLOW_UP_STATUS_LABELS } from '../../constants/MedicalVisits';
import { MedicalVisit } from '../../types';

const dateTimeFormat: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

export const formatMedicalVisitDateTime = (value?: string | null, fallback = '未提供') =>
  value ? new Date(value).toLocaleString('zh-TW', dateTimeFormat) : fallback;

export const formatMedicalVisitDate = (value: string) =>
  new Date(value).toLocaleDateString('zh-TW');

export const buildMedicalVisitDetailRows = (item: MedicalVisit): [string, string][] => [
  ['就醫日期', formatMedicalVisitDateTime(item.visitedAt)],
  ['動物醫院', item.clinicName || '未填寫'],
  ['獸醫姓名', item.veterinarianName || '未填寫'],
  ['看診原因', item.reason],
  ['獸醫說明', item.veterinarianNotes || '未填寫'],
  ['治療／用藥說明', item.treatmentNotes || '未填寫'],
  ['下次回診', formatMedicalVisitDateTime(item.followUpAt, '未安排')],
  [
    '回診提醒',
    item.followUpReminderStatus
      ? FOLLOW_UP_STATUS_LABELS[item.followUpReminderStatus] || item.followUpReminderStatus
      : '未建立',
  ],
  ['費用', item.cost != null ? `NT$ ${item.cost}` : '未填寫'],
  ['補充備註', item.notes || '未填寫'],
  ['建立時間', formatMedicalVisitDateTime(item.createdAt)],
  ['更新時間', formatMedicalVisitDateTime(item.updatedAt)],
];
