/** 用途：就醫前摘要的篩選選項、中文資料標籤與顯示格式。 */
import type { VetBriefSection } from '../../../services/aiService';

export const PRE_VET_RANGES = [7, 15, 30] as const;
export const PRE_VET_SECTION_OPTIONS: { key: VetBriefSection; label: string }[] = [
  { key: 'health', label: '健康異常' },
  { key: 'weight', label: '體重趨勢' },
  { key: 'medications', label: '目前用藥' },
  { key: 'medical', label: '近期就醫' },
  { key: 'daily', label: '日常觀察' },
  { key: 'vaccinations', label: '疫苗' },
  { key: 'dewormings', label: '驅蟲' },
  { key: 'reminders', label: '待辦提醒' },
];
export const DEFAULT_PRE_VET_SECTIONS: VetBriefSection[] = [
  'health',
  'weight',
  'medications',
  'medical',
];
export const EVENT_LABELS: Record<string, string> = {
  vomiting: '嘔吐',
  abnormal_stool: '排便異常',
  low_appetite: '食慾下降',
  abnormal_drinking: '喝水異常',
  low_energy: '精神下降',
  injury: '受傷',
  skin_issue: '皮膚問題',
  eye_ear_issue: '眼睛／耳朵問題',
  possible_ingestion: '疑似誤食',
  other: '其他異常',
};
export const SEVERITY_LABELS: Record<string, string> = {
  mild: '輕微',
  moderate: '需要注意',
  severe: '嚴重',
};
export const DAILY_LABELS: Record<string, Record<string, string>> = {
  water: { low: '偏少', normal: '正常', high: '偏多' },
  food: { low: '偏少', normal: '正常', high: '偏多' },
  energy: { slightly_low: '稍沒精神', normal: '正常' },
  stool: { hard: '偏硬', normal: '正常', soft: '偏軟', watery: '水狀' },
};
export const preVetDateLabel = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
    : '未填寫';
export const preVetSexLabel = (value?: string) =>
  value === 'male' ? '公' : value === 'female' ? '母' : '未填寫';
export const preVetAgeLabel = (birthday?: string) => {
  if (!birthday) return '年齡未填寫';
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return '年齡未填寫';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  )
    age -= 1;
  return `${Math.max(0, age)} 歲`;
};
