import { buildPreVetShareMessage } from '../preVetShare';
import type { VetBriefSection } from '../../../../services/aiService';
import { brief } from './preVetFixture';
import { buildPreVetOnePageRows } from '../preVetOnePage';
import { preVetDateLabel, preVetNeuteredLabel } from '../preVetContent';

describe('buildPreVetShareMessage', () => {
  it('omits records and narrative when their data categories are not selected', () => {
    const message = buildPreVetShareMessage(brief, ['health']);
    expect(message).toContain('HEALTH_ONLY_RECORD');
    expect(message).not.toContain('8.4 kg');
    expect(message).not.toContain('MEDICATION_ONLY_RECORD');
    expect(message).not.toContain('MEDICAL_ONLY_RECORD');
    expect(message).not.toContain('VACCINE_ONLY_RECORD');
    expect(message).not.toContain('DEWORMING_ONLY_RECORD');
    expect(message).not.toContain('REMINDER_ONLY_RECORD');
    expect(message).not.toContain('NARRATIVE_ONLY');
    expect(message).not.toContain('QUESTION_ONLY');
    expect(message).not.toContain('FALLBACK_QUESTION');
  });

  it('shares narrative only when its source categories match the selected scope', () => {
    const scopedBrief = { ...brief, sources: [{ type: 'health', label: '健康異常' }] };
    expect(buildPreVetShareMessage(scopedBrief, ['health'])).toContain('NARRATIVE_ONLY');
    expect(buildPreVetShareMessage(scopedBrief, ['weight'])).not.toContain('NARRATIVE_ONLY');
    expect(buildPreVetShareMessage({ ...scopedBrief, sources: [] }, ['health'])).not.toContain(
      'NARRATIVE_ONLY',
    );
  });

  it.each([7, 15, 30])('preserves the %i-day period and owner concern in sharing', (days) => {
    const message = buildPreVetShareMessage(
      { ...brief, period: { ...brief.period, days } },
      ['health'],
      '毛孩',
      '想了解最近食慾變化',
    );
    expect(message).toContain(`近 ${days} 天`);
    expect(message).toContain('2026/9/13 至 2026/9/28');
    expect(message).toContain('想了解最近食慾變化');
  });

  it('shows weight date and the change between the last two recorded values', () => {
    const weighted = {
      ...brief,
      weightSummary: {
        recordCount: 2,
        series: [
          { measuredAt: '2026-09-20T00:00:00+08:00', weightKg: 8.4 },
          { measuredAt: '2026-09-19T00:00:00+08:00', weightKg: 8.2 },
        ],
      },
    };
    const row = buildPreVetOnePageRows(weighted, ['weight'])[0];
    expect(row.value).toContain('8.4 kg・9/20');
    expect(row.value).toContain('增加 0.20 kg');
  });

  it('distinguishes unneutered from unknown and formats dates in Taipei', () => {
    expect(preVetNeuteredLabel(false)).toBe('未結紮');
    expect(preVetNeuteredLabel(undefined)).toBe('結紮狀態未填寫');
    expect(preVetDateLabel('2026-09-19T16:00:00Z')).toBe('9/20');
    expect(preVetDateLabel('invalid')).toBe('未填寫');
    expect(
      buildPreVetShareMessage({ ...brief, pet: { ...brief.pet, isNeutered: false } }, ['health']),
    ).toContain('未結紮');
  });

  it('shares a concise one-page summary of selected categories', () => {
    const allSections: VetBriefSection[] = [
      'health',
      'weight',
      'daily',
      'medications',
      'medical',
      'vaccinations',
      'dewormings',
      'reminders',
    ];
    const message = buildPreVetShareMessage(brief, allSections);
    for (const marker of [
      'HEALTH_ONLY_RECORD',
      '8.4 kg',
      '日常觀察',
      'MEDICATION_ONLY_RECORD',
      'MEDICAL_ONLY_RECORD',
      'VACCINE_ONLY_RECORD',
      'DEWORMING_ONLY_RECORD',
      'REMINDER_ONLY_RECORD',
      'NARRATIVE_ONLY',
      'TIMELINE_ONLY',
      'DISCLAIMER_ONLY',
    ]) {
      if (marker === 'TIMELINE_ONLY') expect(message).not.toContain(marker);
      else expect(message).toContain(marker);
    }
    expect(message.split('可向獸醫確認')).toHaveLength(2);
    expect(message).toContain('近期重點');
    expect(message).toContain('完整照護紀錄可於 MEGO 查看');
    expect(message).not.toContain('FALLBACK_QUESTION');
  });
});
