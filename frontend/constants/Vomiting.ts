/** 用途：集中嘔吐快速表單選項、摘要與保守安全提示規則。 */
import {
  DrinkingCondition,
  EnergyCondition,
  Severity,
  VomitColor,
  VomitCount,
  VomitingDetails,
} from '../types';

export const VOMIT_COUNT_OPTIONS: Array<[VomitCount, string]> = [
  ['once', '1 次'],
  ['two_to_three', '2～3 次'],
  ['four_or_more', '4 次以上'],
];
export const ENERGY_OPTIONS: Array<[EnergyCondition, string]> = [
  ['normal', '正常'],
  ['slightly_low', '稍差'],
  ['very_low', '很差'],
];
export const VOMIT_COLOR_OPTIONS: Array<[VomitColor, string]> = [
  ['transparent', '透明'],
  ['white', '白色'],
  ['yellow', '黃色'],
  ['green', '綠色'],
  ['brown', '褐色'],
  ['red_or_blood', '紅色或疑似有血'],
  ['other', '其他'],
];
export const DRINKING_OPTIONS: Array<[DrinkingCondition, string]> = [
  ['normal', '可以正常喝水'],
  ['vomits_after_drinking', '喝水後又吐'],
  ['refuses', '不願意喝水'],
  ['unknown', '不確定'],
];

const labelFor = <T extends string>(options: Array<[T, string]>, value: T) =>
  options.find(([key]) => key === value)?.[1] ?? value;

export const buildVomitingSummary = (details: VomitingDetails) =>
  `嘔吐 ${labelFor(VOMIT_COUNT_OPTIONS, details.vomitCount)}，精神${labelFor(ENERGY_OPTIONS, details.energyCondition)}`;

export const shouldShowVomitingSafety = (details: VomitingDetails, severity: Severity) =>
  details.vomitCount === 'four_or_more' ||
  details.energyCondition === 'very_low' ||
  severity === 'severe' ||
  details.suspectedBlood ||
  details.suspectedForeignObject ||
  details.drinkingCondition === 'vomits_after_drinking' ||
  details.drinkingCondition === 'refuses';

export const VOMITING_SAFETY_MESSAGE =
  '如果毛孩持續惡化、反覆嘔吐、無法飲水、精神明顯下降、呼吸困難、昏倒或疑似大量出血，請儘快聯絡動物醫院。';

export const normalizeVomitingDetails = (value: Record<string, unknown>): VomitingDetails => {
  const countMap: Record<string, VomitCount> = {
    '1 次': 'once',
    '2～3 次': 'two_to_three',
    '4 次以上': 'four_or_more',
  };
  const energyMap: Record<string, EnergyCondition> = {
    正常: 'normal',
    稍差: 'slightly_low',
    很差: 'very_low',
  };
  const drinkingMap: Record<string, DrinkingCondition> = {
    可以: 'normal',
    不太能: 'vomits_after_drinking',
    完全不能: 'refuses',
  };
  const colorMap: Record<string, VomitColor> = {
    透明: 'transparent',
    白色: 'white',
    黃色: 'yellow',
    綠色: 'green',
    褐色: 'brown',
    紅色: 'red_or_blood',
    其他: 'other',
  };
  const contents = String(value.contents ?? '');
  return {
    vomitCount: (value.vomitCount as VomitCount) ?? countMap[String(value.count)],
    energyCondition: (value.energyCondition as EnergyCondition) ?? energyMap[String(value.energy)],
    color: (value.color as VomitColor) ?? colorMap[String(value.color)],
    hasFoam: Boolean(value.hasFoam) || contents === '有泡沫',
    hasFood: Boolean(value.hasFood) || contents === '有食物',
    suspectedBlood: Boolean(value.suspectedBlood) || contents === '疑似有血',
    suspectedForeignObject: Boolean(value.suspectedForeignObject) || contents === '疑似有異物',
    drinkingCondition:
      (value.drinkingCondition as DrinkingCondition) ?? drinkingMap[String(value.canDrink)],
  };
};

export const vomitingDetailRows = (details: VomitingDetails) => {
  const rows: Array<[string, string]> = [
    ['發生次數', labelFor(VOMIT_COUNT_OPTIONS, details.vomitCount)],
    ['精神狀況', labelFor(ENERGY_OPTIONS, details.energyCondition)],
  ];
  if (details.color) rows.push(['顏色', labelFor(VOMIT_COLOR_OPTIONS, details.color)]);
  const features = [
    details.hasFoam && '有泡沫',
    details.hasFood && '有未消化食物',
    details.suspectedBlood && '疑似有血',
    details.suspectedForeignObject && '疑似有異物',
  ]
    .filter(Boolean)
    .join('、');
  if (features) rows.push(['內容特徵', features]);
  if (details.drinkingCondition) {
    rows.push(['飲水狀況', labelFor(DRINKING_OPTIONS, details.drinkingCondition)]);
  }
  return rows;
};
