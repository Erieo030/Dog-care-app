import { HealthEventType, Severity } from '../../types';

export const CREATE_EVENT_SEVERITY_OPTIONS: Array<[Severity, string]> = [
  ['mild', '輕微'],
  ['moderate', '需要注意'],
  ['severe', '嚴重'],
];

export type HealthEventQuickQuestion = {
  label: string;
  field: string;
  values: string[];
};

const BASE_QUESTIONS: Partial<Record<HealthEventType, HealthEventQuickQuestion[]>> = {
  vomiting: [
    { label: '發生幾次？', field: 'count', values: ['1 次', '2～3 次', '4 次以上'] },
    { label: '精神狀況？', field: 'energy', values: ['正常', '稍差', '很差'] },
  ],
  abnormal_stool: [
    { label: '形狀', field: 'shape', values: ['偏軟', '水狀', '很硬', '其他'] },
    { label: '顏色', field: 'color', values: ['一般', '黃色', '綠色', '黑色', '紅色'] },
    { label: '其他', field: 'other', values: ['黏液', '疑似血液', '異物', '疑似蟲體'] },
  ],
  low_appetite: [
    { label: '食慾狀況', field: 'level', values: ['少吃一些', '吃不到一半', '完全不吃'] },
  ],
  low_energy: [
    { label: '精神狀況', field: 'level', values: ['稍微沒精神', '明顯沒精神', '幾乎不活動'] },
  ],
};

const VOMITING_ADVANCED_QUESTIONS: HealthEventQuickQuestion[] = [
  { label: '顏色', field: 'color', values: ['透明', '黃色', '褐色', '紅色', '其他'] },
  { label: '內容物', field: 'contents', values: ['有泡沫', '有食物', '疑似有血', '疑似有異物'] },
  { label: '是否能正常喝水', field: 'canDrink', values: ['可以', '不太能', '完全不能'] },
];

export const getCreateHealthEventQuestions = (type: HealthEventType, showAdvanced: boolean) => [
  ...(BASE_QUESTIONS[type] ?? []),
  ...(type === 'vomiting' && showAdvanced ? VOMITING_ADVANCED_QUESTIONS : []),
];
