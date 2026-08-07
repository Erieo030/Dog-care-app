/** 用途：集中排便異常快速表單選項、摘要、詳細文字與安全提示規則。 */
import { Severity, StoolColor, StoolConsistency, StoolDetails } from '../types';

export const STOOL_CONSISTENCY_OPTIONS: Array<[StoolConsistency, string]> = [
  ['soft', '偏軟'],
  ['watery', '水狀'],
  ['hard', '很硬'],
  ['other', '其他'],
];
export const STOOL_COLOR_OPTIONS: Array<[StoolColor, string]> = [
  ['normal', '一般'],
  ['yellow', '黃色'],
  ['green', '綠色'],
  ['black', '黑色'],
  ['red', '紅色'],
  ['other', '其他'],
];

const consistencySummary: Record<StoolConsistency, string> = {
  soft: '排便偏軟',
  watery: '水狀排便',
  hard: '排便很硬',
  other: '排便外觀其他',
};
const colorSummary: Record<StoolColor, string> = {
  normal: '顏色一般',
  yellow: '黃色',
  green: '綠色',
  black: '黑色',
  red: '紅色',
  other: '顏色其他',
};

const labelFor = <T extends string>(options: Array<[T, string]>, value: T) =>
  options.find(([key]) => key === value)?.[1] ?? value;

export const buildStoolSummary = (details: StoolDetails) => {
  const features = [
    details.suspectedBlood && '疑似有血',
    details.hasForeignObject && '有異物',
    details.suspectedParasite && '疑似蟲體',
    details.hasMucus && '有黏液',
  ].filter(Boolean).slice(0, 2);
  return [
    consistencySummary[details.stoolConsistency],
    colorSummary[details.stoolColor],
    ...features,
  ].join('，');
};

export const shouldShowStoolSafety = (details: StoolDetails, severity: Severity) =>
  (details.stoolConsistency === 'watery' && severity === 'severe')
  || details.stoolColor === 'black'
  || details.stoolColor === 'red'
  || details.suspectedBlood
  || details.hasForeignObject
  || details.suspectedParasite
  || severity === 'severe';

export const STOOL_SAFETY_MESSAGE =
  '如果毛孩持續腹瀉、精神明顯下降、無法飲水、反覆排出黑色或紅色糞便、疑似大量出血、誤食異物或症狀持續惡化，請儘快聯絡動物醫院。';

export const normalizeStoolDetails = (value: Record<string, unknown>): StoolDetails => {
  const consistencyMap: Record<string, StoolConsistency> = {
    '偏軟': 'soft', '水狀': 'watery', '很硬': 'hard', '其他': 'other',
  };
  const colorMap: Record<string, StoolColor> = {
    '一般': 'normal', '黃色': 'yellow', '綠色': 'green',
    '黑色': 'black', '紅色': 'red', '其他': 'other',
  };
  const legacyOther = String(value.other ?? '');
  return {
    stoolConsistency: (value.stoolConsistency as StoolConsistency)
      ?? consistencyMap[String(value.shape)],
    stoolColor: (value.stoolColor as StoolColor) ?? colorMap[String(value.color)],
    hasMucus: Boolean(value.hasMucus) || legacyOther === '黏液',
    suspectedBlood: Boolean(value.suspectedBlood) || legacyOther === '疑似血液',
    hasForeignObject: Boolean(value.hasForeignObject) || legacyOther === '異物',
    suspectedParasite: Boolean(value.suspectedParasite) || legacyOther === '疑似蟲體',
  };
};

export const stoolDetailRows = (details: StoolDetails): Array<[string, string]> => [
  ['形狀', labelFor(STOOL_CONSISTENCY_OPTIONS, details.stoolConsistency)],
  ['顏色', labelFor(STOOL_COLOR_OPTIONS, details.stoolColor)],
  ['黏液', details.hasMucus ? '有' : '無'],
  ['疑似血液', details.suspectedBlood ? '有' : '無'],
  ['異物', details.hasForeignObject ? '有' : '無'],
  ['疑似蟲體', details.suspectedParasite ? '有' : '無'],
];
