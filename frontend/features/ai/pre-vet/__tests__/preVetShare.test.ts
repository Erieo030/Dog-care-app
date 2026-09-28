import { buildPreVetShareMessage } from '../preVetShare';
import type { VetBriefSection, VetVisitBrief } from '../../../../services/aiService';

const brief: VetVisitBrief = {
  pet: { name: 'Kuro', breed: '柴犬', sex: 'male', isNeutered: true, allergies: '雞肉', chronicDiseases: '無' },
  period: { days: 15, startAt: '2026-09-13T00:00:00+08:00', endAt: '2026-09-28T00:00:00+08:00' },
  keyObservations: [],
  weightSummary: { recordCount: 1, series: [{ measuredAt: '2026-09-20T00:00:00+08:00', weightKg: 8.4 }] },
  dailyLogSummary: { recordCount: 1, water: { latest: 'normal' }, food: { latest: 'low' }, energy: { latest: 'normal' }, stool: { latest: 'soft' } },
  recentHealthEvents: [{ id: 'h1', type: 'vomiting', occurredAt: '2026-09-21T00:00:00+08:00', severity: 'mild', summary: 'HEALTH_ONLY_RECORD' }],
  activeMedications: [{ name: 'MEDICATION_ONLY_RECORD', instructions: '飯後' }],
  recentMedicalVisits: [{ id: 'm1', visitedAt: '2026-09-22T00:00:00+08:00', reason: 'MEDICAL_ONLY_RECORD' }],
  vaccination: { latest: { vaccineName: 'VACCINE_ONLY_RECORD', administeredAt: '2026-09-10T00:00:00+08:00' } },
  deworming: { latest: { productName: 'DEWORMING_ONLY_RECORD', administeredAt: '2026-09-11T00:00:00+08:00' } },
  monitorAlerts: [],
  dataCoverage: {},
  aiNarrative: { overview: 'NARRATIVE_ONLY', timeline: ['TIMELINE_ONLY'], questions: ['QUESTION_ONLY'], dataGaps: [] },
  disclaimer: 'DISCLAIMER_ONLY',
  generatedAt: '2026-09-28T00:00:00+08:00',
  generationMode: 'llm',
  sources: [],
  scopeNotes: [],
  vetQuestions: ['FALLBACK_QUESTION'],
  upcomingReminders: [{ title: 'REMINDER_ONLY_RECORD', scheduledAt: '2026-09-29T00:00:00+08:00' }],
};

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
    // Narrative is included only after it was generated using the same selected sections.
    expect(message).toContain('NARRATIVE_ONLY');
  });

  it('shares every selected category with readable section breaks and only one question block', () => {
    const allSections: VetBriefSection[] = [
      'health', 'weight', 'daily', 'medications', 'medical', 'vaccinations', 'dewormings', 'reminders',
    ];
    const message = buildPreVetShareMessage(brief, allSections);
    for (const marker of [
      'HEALTH_ONLY_RECORD', '8.4 kg', '日常觀察', 'MEDICATION_ONLY_RECORD',
      'MEDICAL_ONLY_RECORD', 'VACCINE_ONLY_RECORD', 'DEWORMING_ONLY_RECORD',
      'REMINDER_ONLY_RECORD', 'NARRATIVE_ONLY', 'TIMELINE_ONLY', 'DISCLAIMER_ONLY',
    ]) {
      expect(message).toContain(marker);
    }
    expect(message.split('可向獸醫確認')).toHaveLength(2);
    expect(message).toContain('健康異常\n•');
    expect(message).toContain('\n\n體重趨勢\n•');
    expect(message).not.toContain('FALLBACK_QUESTION');
  });
});
