import { analyzeHealthTrend, getHealthObservationText, DailyRecord } from '../healthTrendEngine';

const records = (values: Partial<DailyRecord>[]): DailyRecord[] =>
  values.map((value, index) => ({ date: `2026-09-${String(20 + index).padStart(2, '0')}`, ...value }));

describe('healthTrendEngine', () => {
  test('單日喝水偏少維持穩定', () => {
    expect(analyzeHealthTrend(records([{ water: 'low' }])).overallLevel).toBe('stable');
  });

  test('喝水偏少連續兩天為 watch', () => {
    const result = analyzeHealthTrend(records([{ water: 'low' }, { water: 'low' }]));
    expect(result).toMatchObject({ overallLevel: 'watch', watchCount: 1, continuedCount: 0 });
    expect(getHealthObservationText(result)).toBe('近期有 1 項需留意');
  });

  test('喝水偏少連續三天為 continued', () => {
    const result = analyzeHealthTrend(records([{ water: 'low' }, { water: 'low' }, { water: 'low' }]));
    expect(result).toMatchObject({ overallLevel: 'continued', watchCount: 0, continuedCount: 1 });
    expect(getHealthObservationText(result)).toBe('有 1 項持續需留意');
  });

  test('便便偏軟連續兩天為 watch', () => {
    expect(analyzeHealthTrend(records([{ stool: 'soft' }, { stool: 'soft' }])).overallLevel).toBe('watch');
  });

  test('單日水狀便為 watch', () => {
    expect(analyzeHealthTrend(records([{ stool: 'watery' }])).overallLevel).toBe('watch');
  });

  test('水狀便連續兩天為 continued', () => {
    expect(analyzeHealthTrend(records([{ stool: 'watery' }, { stool: 'watery' }])).overallLevel).toBe('continued');
  });

  test('喝水偏少與便便偏軟同時 watch 時會計算兩項', () => {
    const result = analyzeHealthTrend(records([{ water: 'low', stool: 'soft' }, { water: 'low', stool: 'soft' }]));
    expect(result).toMatchObject({ overallLevel: 'watch', watchCount: 2, continuedCount: 0 });
    expect(getHealthObservationText(result)).toBe('近期有 2 項需留意');
  });

  test('continued 優先顯示，但仍保留 watch alert', () => {
    const result = analyzeHealthTrend(records([{ water: 'low', stool: 'normal' }, { water: 'low', stool: 'soft' }, { water: 'low', stool: 'soft' }]));
    expect(result).toMatchObject({ overallLevel: 'continued', watchCount: 1, continuedCount: 1 });
    expect(getHealthObservationText(result)).toBe('有 1 項持續需留意');
  });

  test('正常值會中斷喝水偏少趨勢', () => {
    const result = analyzeHealthTrend(records([{ water: 'low' }, { water: 'normal' }, { water: 'low' }]));
    expect(result).toMatchObject({ overallLevel: 'stable', watchCount: 0, continuedCount: 0 });
  });
});
