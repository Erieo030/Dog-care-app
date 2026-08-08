/** 用途：集中三種觀察型快速紀錄的選項、相容轉換、摘要與安全提示規則。 */
import { HealthEventType, ObservationHealthEventType, Severity } from '../types';

export type Option = [string, string];
export type ObservationValues = Record<string, string | string[]>;
export const OBSERVATION_TYPES: ObservationHealthEventType[] = [
  'low_appetite',
  'low_energy',
  'abnormal_drinking',
];
export const isObservationType = (type: HealthEventType): type is ObservationHealthEventType =>
  OBSERVATION_TYPES.includes(type as ObservationHealthEventType);

export const OBSERVATION_CONFIG: Record<
  ObservationHealthEventType,
  {
    title: string;
    primaryKey: string;
    primaryLabel: string;
    primaryOptions: Option[];
    optionalGroups: Array<{ key: string; label: string; options: Option[] }>;
    multiGroup?: { key: string; label: string; options: Option[] };
  }
> = {
  low_appetite: {
    title: '食慾下降',
    primaryKey: 'appetiteLevel',
    primaryLabel: '食慾狀況',
    primaryOptions: [
      ['slightly_reduced', '少吃一些'],
      ['less_than_half', '吃不到一半'],
      ['not_eating', '完全不吃'],
    ],
    optionalGroups: [
      {
        key: 'duration',
        label: '持續時間（選填）',
        options: [
          ['one_meal', '這一餐'],
          ['within_half_day', '半天內'],
          ['one_day', '一天'],
          ['over_one_day', '超過一天'],
        ],
      },
    ],
    multiGroup: {
      key: 'associatedSymptoms',
      label: '是否有其他狀況（可複選）',
      options: [
        ['vomiting', '嘔吐'],
        ['abnormal_stool', '排便異常'],
        ['reduced_drinking', '喝水減少'],
        ['low_energy', '精神下降'],
      ],
    },
  },
  low_energy: {
    title: '精神下降',
    primaryKey: 'energyLevel',
    primaryLabel: '精神狀況',
    primaryOptions: [
      ['slightly_low', '稍微沒精神'],
      ['clearly_low', '明顯沒精神'],
      ['barely_active', '幾乎不活動'],
    ],
    optionalGroups: [
      {
        key: 'movementCondition',
        label: '活動反應（選填）',
        options: [
          ['normal_movement', '仍會正常走動'],
          ['reduced_movement', '走動明顯減少'],
          ['reluctant_to_stand', '不太願意站立'],
          ['unknown', '不確定'],
        ],
      },
      {
        key: 'responseCondition',
        label: '是否能正常回應（選填）',
        options: [
          ['normal_response', '反應正常'],
          ['slow_response', '反應較慢'],
          ['minimal_response', '幾乎沒有反應'],
          ['unknown', '不確定'],
        ],
      },
    ],
  },
  abnormal_drinking: {
    title: '喝水異常',
    primaryKey: 'drinkingLevel',
    primaryLabel: '喝水狀況',
    primaryOptions: [
      ['less_than_usual', '喝得比平常少'],
      ['barely_drinking', '幾乎不喝'],
      ['more_than_usual', '喝得比平常多'],
      ['frequent_drinking', '一直頻繁喝水'],
    ],
    optionalGroups: [
      {
        key: 'duration',
        label: '持續時間（選填）',
        options: [
          ['few_hours', '幾小時'],
          ['half_day', '半天'],
          ['one_day', '一天'],
          ['over_one_day', '超過一天'],
        ],
      },
      {
        key: 'drinkingAbility',
        label: '是否能正常飲水（選填）',
        options: [
          ['normal', '可以正常喝下'],
          ['vomits_after_drinking', '喝水後嘔吐'],
          ['unable_to_drink', '想喝但喝不下'],
          ['unknown', '不確定'],
        ],
      },
    ],
  },
};

const labelOf = (options: Option[], value: unknown) => options.find(([key]) => key === value)?.[1];
export const emptyObservationValues = (type: ObservationHealthEventType): ObservationValues =>
  type === 'low_appetite' ? { associatedSymptoms: [] } : {};

export const normalizeObservationDetails = (
  type: ObservationHealthEventType,
  raw: Record<string, unknown>,
): ObservationValues => {
  const config = OBSERVATION_CONFIG[type];
  const result = emptyObservationValues(type);
  const primary = raw[config.primaryKey];
  if (typeof primary === 'string') result[config.primaryKey] = primary;
  config.optionalGroups.forEach(({ key }) => {
    if (typeof raw[key] === 'string') result[key] = raw[key] as string;
  });
  if (config.multiGroup)
    result[config.multiGroup.key] = Array.isArray(raw[config.multiGroup.key])
      ? (raw[config.multiGroup.key] as unknown[]).filter(
          (value): value is string => typeof value === 'string',
        )
      : [];
  return result;
};

export const buildObservationSummary = (
  type: ObservationHealthEventType,
  values: ObservationValues,
) => {
  const config = OBSERVATION_CONFIG[type];
  const primary = labelOf(config.primaryOptions, values[config.primaryKey]) ?? config.title;
  if (type === 'low_appetite') {
    const base = values.appetiteLevel === 'not_eating' ? '完全不吃' : `食慾下降，${primary}`;
    const duration = labelOf(config.optionalGroups[0].options, values.duration);
    const symptoms = Array.isArray(values.associatedSymptoms) ? values.associatedSymptoms : [];
    const symptomText = symptoms
      .slice(0, 2)
      .map((value) => labelOf(config.multiGroup!.options, value))
      .filter(Boolean)
      .join('、');
    return [base, duration ? `已持續${duration}` : '', symptomText ? `伴隨${symptomText}` : '']
      .filter(Boolean)
      .join('，');
  }
  if (type === 'low_energy') {
    const response = labelOf(config.optionalGroups[1].options, values.responseCondition);
    const movement = labelOf(config.optionalGroups[0].options, values.movementCondition);
    return [
      primary,
      response && response !== '反應正常' && response !== '不確定' ? response : '',
      !response && movement && movement !== '仍會正常走動' && movement !== '不確定' ? movement : '',
    ]
      .filter(Boolean)
      .join('，');
  }
  const duration = labelOf(config.optionalGroups[0].options, values.duration);
  const ability = labelOf(config.optionalGroups[1].options, values.drinkingAbility);
  const drinkingLabel: Record<string, string> = {
    less_than_usual: '喝水量比平常少',
    barely_drinking: '幾乎不喝水',
    more_than_usual: '喝水量比平常多',
    frequent_drinking: '頻繁喝水',
  };
  return [
    drinkingLabel[String(values.drinkingLevel)] ?? primary,
    duration ? `持續${duration}` : '',
    ability && !['可以正常喝下', '不確定'].includes(ability) ? ability : '',
  ]
    .filter(Boolean)
    .join('，');
};

export const shouldShowObservationSafety = (
  type: ObservationHealthEventType,
  values: ObservationValues,
  severity: Severity,
) => {
  if (severity === 'severe') return true;
  if (type === 'low_appetite')
    return (
      values.appetiteLevel === 'not_eating' ||
      values.duration === 'over_one_day' ||
      (Array.isArray(values.associatedSymptoms) &&
        values.associatedSymptoms.some((value) => ['vomiting', 'low_energy'].includes(value)))
    );
  if (type === 'low_energy')
    return (
      values.energyLevel === 'barely_active' ||
      values.movementCondition === 'reluctant_to_stand' ||
      values.responseCondition === 'minimal_response'
    );
  return (
    values.drinkingLevel === 'barely_drinking' ||
    values.drinkingAbility === 'vomits_after_drinking' ||
    values.drinkingAbility === 'unable_to_drink' ||
    values.duration === 'over_one_day'
  );
};

export const OBSERVATION_SAFETY_MESSAGE =
  '如果毛孩症狀持續惡化、完全不吃不喝、無法正常飲水、幾乎沒有反應、呼吸困難、昏倒或明顯虛弱，請儘快聯絡動物醫院。';

export const observationDetailRows = (
  type: ObservationHealthEventType,
  values: ObservationValues,
): Array<[string, string]> => {
  const config = OBSERVATION_CONFIG[type];
  const rows: Array<[string, string]> = [
    [config.primaryLabel, labelOf(config.primaryOptions, values[config.primaryKey]) ?? '未填寫'],
  ];
  config.optionalGroups.forEach((group) =>
    rows.push([
      group.label.replace('（選填）', ''),
      labelOf(group.options, values[group.key]) ?? '未填寫',
    ]),
  );
  if (config.multiGroup) {
    const selected = Array.isArray(values[config.multiGroup.key])
      ? (values[config.multiGroup.key] as string[])
      : [];
    rows.push([
      '伴隨狀況',
      selected
        .map((value) => labelOf(config.multiGroup!.options, value))
        .filter(Boolean)
        .join('、') || '無',
    ]);
  }
  return rows;
};
