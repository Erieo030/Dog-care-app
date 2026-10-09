import type { VetVisitBrief } from '../../../../services/aiService';

export const brief: VetVisitBrief = {
  pet: {
    name: 'Kuro',
    breed: '柴犬',
    sex: 'male',
    isNeutered: true,
    allergies: '雞肉',
    chronicDiseases: '無',
  },
  period: { days: 15, startAt: '2026-09-13T00:00:00+08:00', endAt: '2026-09-28T00:00:00+08:00' },
  keyObservations: [],
  weightSummary: {
    recordCount: 1,
    series: [{ measuredAt: '2026-09-20T00:00:00+08:00', weightKg: 8.4 }],
  },
  dailyLogSummary: {
    recordCount: 1,
    water: { latest: 'normal' },
    food: { latest: 'low' },
    energy: { latest: 'normal' },
    stool: { latest: 'soft' },
  },
  recentHealthEvents: [
    {
      id: 'h1',
      type: 'vomiting',
      occurredAt: '2026-09-21T00:00:00+08:00',
      severity: 'mild',
      summary: 'HEALTH_ONLY_RECORD',
    },
  ],
  activeMedications: [{ name: 'MEDICATION_ONLY_RECORD', instructions: '飯後' }],
  recentMedicalVisits: [
    { id: 'm1', visitedAt: '2026-09-22T00:00:00+08:00', reason: 'MEDICAL_ONLY_RECORD' },
  ],
  vaccination: {
    latest: { vaccineName: 'VACCINE_ONLY_RECORD', administeredAt: '2026-09-10T00:00:00+08:00' },
  },
  deworming: {
    latest: { productName: 'DEWORMING_ONLY_RECORD', administeredAt: '2026-09-11T00:00:00+08:00' },
  },
  monitorAlerts: [],
  dataCoverage: {},
  aiNarrative: {
    overview: 'NARRATIVE_ONLY',
    timeline: ['TIMELINE_ONLY'],
    questions: ['QUESTION_ONLY'],
    dataGaps: [],
  },
  disclaimer: 'DISCLAIMER_ONLY',
  generatedAt: '2026-09-28T00:00:00+08:00',
  generationMode: 'llm',
  sources: [
    'health',
    'weight',
    'daily',
    'medications',
    'medical',
    'vaccinations',
    'dewormings',
    'reminders',
  ].map((type) => ({ type, label: type })),
  scopeNotes: [],
  vetQuestions: ['FALLBACK_QUESTION'],
  upcomingReminders: [{ title: 'REMINDER_ONLY_RECORD', scheduledAt: '2026-09-29T00:00:00+08:00' }],
};
