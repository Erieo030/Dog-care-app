export type HealthTrendLevel = 'stable' | 'watch' | 'continued';

export interface DailyRecord {
  date: string;
  water?: 'low' | 'normal' | 'high';
  food?: 'low' | 'normal' | 'high';
  energy?: 'normal' | 'slightly_low';
  stool?: 'hard' | 'normal' | 'soft' | 'watery';
}

export interface HealthTrendAlert {
  category: 'water' | 'food' | 'energy' | 'stool';
  status: string;
  level: HealthTrendLevel;
  consecutiveDays: number;
  title: string;
  message: string;
}

export interface HealthTrendResult {
  overallLevel: HealthTrendLevel;
  watchCount: number;
  continuedCount: number;
  alerts: HealthTrendAlert[];
}

type TrendKey = keyof Omit<DailyRecord, 'date'>;
type Rule = {
  category: HealthTrendAlert['category'];
  status: string;
  watchAt: number;
  continuedAt?: number;
  title: string;
  watchMessage: string;
  continuedMessage?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const RULES: Rule[] = [
  { category: 'water', status: 'low', watchAt: 2, continuedAt: 3, title: '喝水', watchMessage: '最近喝水比較少，可以再留意一下毛孩的飲水狀況。', continuedMessage: '喝水量已持續幾天偏少，如果持續沒有改善，可以考慮諮詢獸醫。' },
  { category: 'water', status: 'high', watchAt: 2, continuedAt: 3, title: '喝水', watchMessage: '最近喝水比平常多，可以持續觀察一下。', continuedMessage: '喝水量已持續幾天偏多，如果沒有明顯原因，可以考慮諮詢獸醫。' },
  { category: 'food', status: 'low', watchAt: 2, continuedAt: 3, title: '飼料', watchMessage: '最近食量比較少，可以持續觀察食慾狀況。', continuedMessage: '食量已持續幾天偏少，如果沒有恢復，可以考慮諮詢獸醫。' },
  { category: 'food', status: 'high', watchAt: 3, title: '飼料', watchMessage: '最近食量比平常多，可以留意活動量與飲食狀況。' },
  { category: 'energy', status: 'slightly_low', watchAt: 2, continuedAt: 3, title: '精神', watchMessage: '最近看起來比較沒精神，可以讓毛孩多休息並持續觀察。', continuedMessage: '精神狀態已持續幾天比較低落，如果沒有恢復，可以考慮諮詢獸醫。' },
  { category: 'stool', status: 'hard', watchAt: 2, continuedAt: 3, title: '便便', watchMessage: '最近便便比較硬，可以留意喝水與排便狀況。', continuedMessage: '便便已持續幾天偏硬，如果排便狀況沒有改善，可以考慮諮詢獸醫。' },
  { category: 'stool', status: 'soft', watchAt: 2, continuedAt: 3, title: '便便', watchMessage: '最近便便比較軟，可以持續觀察飲食與排便狀況。', continuedMessage: '便便已持續幾天偏軟，如果沒有恢復，可以考慮諮詢獸醫。' },
  { category: 'stool', status: 'watery', watchAt: 1, continuedAt: 2, title: '便便', watchMessage: '今天便便比較稀，可以留意精神、食慾與下一次排便狀況。', continuedMessage: '水狀便已持續一段時間，如果沒有改善，建議諮詢獸醫。' },
];

const dateToUtcDay = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(timestamp) ? null : timestamp;
};

const consecutiveStatusDays = (records: DailyRecord[], category: TrendKey, status: string) => {
  const ordered = records
    .map((record) => ({ record, day: dateToUtcDay(record.date) }))
    .filter((entry): entry is { record: DailyRecord; day: number } => entry.day !== null)
    .sort((left, right) => right.day - left.day);

  let consecutiveDays = 0;
  let previousDay: number | null = null;
  for (const entry of ordered) {
    if (previousDay !== null && previousDay - entry.day !== DAY_MS) break;
    if (entry.record[category] !== status) break;
    consecutiveDays += 1;
    previousDay = entry.day;
  }
  return consecutiveDays;
};

export function analyzeHealthTrend(records: DailyRecord[]): HealthTrendResult {
  const alerts = RULES.flatMap((rule) => {
    const consecutiveDays = consecutiveStatusDays(records, rule.category, rule.status);
    if (consecutiveDays < rule.watchAt) return [];
    const level: HealthTrendLevel = rule.continuedAt && consecutiveDays >= rule.continuedAt ? 'continued' : 'watch';
    return [{
      category: rule.category,
      status: rule.status,
      level,
      consecutiveDays,
      title: rule.title,
      message: level === 'continued' ? rule.continuedMessage || rule.watchMessage : rule.watchMessage,
    }];
  });
  const continuedCount = alerts.filter((alert) => alert.level === 'continued').length;
  const watchCount = alerts.filter((alert) => alert.level === 'watch').length;
  return {
    overallLevel: continuedCount ? 'continued' : watchCount ? 'watch' : 'stable',
    watchCount,
    continuedCount,
    alerts,
  };
}

export function getHealthObservationText(result: HealthTrendResult): string {
  if (result.overallLevel === 'continued') return `有 ${result.continuedCount} 項持續需留意`;
  if (result.overallLevel === 'watch') return `近期有 ${result.watchCount} 項需留意`;
  return '今天狀況穩定';
}
