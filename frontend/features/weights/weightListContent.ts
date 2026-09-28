import type { WeightRecord, WeightSummary } from '../../types';

export type WeightPeriod = 7 | 'all';

export const EMPTY_WEIGHT_SUMMARY: WeightSummary = {
  latestWeightKg: null,
  latestMeasuredAt: null,
  differenceKg: null,
  change: null,
};

export const WEIGHT_PERIODS: Array<{ value: WeightPeriod; label: string }> = [
  { value: 7, label: '最近 7 天' },
  { value: 'all', label: '全部' },
];

export function formatWeightDate(value: string) {
  return new Date(value).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
}

export function filterWeightsByPeriod(items: WeightRecord[], period: WeightPeriod) {
  if (period === 'all') return items;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (period - 1));
  return items.filter((item) => new Date(item.measuredAt) >= cutoff);
}

export function getWeightDifferenceText(summary: WeightSummary) {
  if (summary.latestWeightKg == null) return null;
  if (summary.differenceKg == null) return '尚無前一次體重可比較';
  if (summary.change === 'unchanged') return '與前一次相比無變化';
  const direction = summary.change === 'increased' ? '增加' : '減少';
  const difference = Math.abs(summary.differenceKg)
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1');
  return `比前一次${direction} ${difference} kg`;
}
