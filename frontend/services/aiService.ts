const parseTimeout = (value: string | undefined) => (value?.trim() ? Number(value) : Number.NaN);
const configuredRequestTimeoutMs = parseTimeout(process.env.EXPO_PUBLIC_AI_REQUEST_TIMEOUT_MS);
const configuredChatTimeoutMs = parseTimeout(process.env.EXPO_PUBLIC_AI_CHAT_TIMEOUT_MS);
const configuredVetBriefTimeoutMs = parseTimeout(process.env.EXPO_PUBLIC_AI_VET_BRIEF_TIMEOUT_MS);
const boundedTimeout = (value: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(180000, Math.max(5000, Math.trunc(value))) : fallback;

const AI_REQUEST_TIMEOUT_MS = boundedTimeout(configuredRequestTimeoutMs, 45000);
// General chat may perform bounded reference retrieval before calling the answer model.
const AI_CHAT_TIMEOUT_MS = boundedTimeout(configuredChatTimeoutMs, 75000);
const AI_VET_BRIEF_TIMEOUT_MS = boundedTimeout(configuredVetBriefTimeoutMs, 20000);
import { apiData } from './api';
export interface HealthMonitorAlert {
  id: string;
  type: string;
  severity: 'info' | 'attention' | 'urgent';
  title: string;
  message: string;
  evidence: Record<string, unknown>;
}
export interface HealthMonitorResult {
  period: { days: number; startAt: string; endAt: string };
  alerts: HealthMonitorAlert[];
  summary: { total: number; info: number; attention: number; urgent: number };
}
export const getHealthMonitor = (userId: string, petId: string, range = 30) =>
  apiData<HealthMonitorResult>(
    `/api/pets/${petId}/ai/health-monitor?userId=${encodeURIComponent(userId)}&range=${range}`,
    {},
    AI_REQUEST_TIMEOUT_MS,
  );

export interface HealthSummaryResponse {
  periodDays: number;
  headline: string;
  summary: string;
  highlights: string[];
  attentionItems: string[];
  upcomingCare: string[];
  dataCoverage: string;
  disclaimer: string;
  provider: string;
  model?: string | null;
  actualModel?: string | null;
  generatedAt: string;
  fallbackUsed: boolean;
}
export const getHealthSummary = (userId: string, petId: string, range = 30) =>
  apiData<HealthSummaryResponse>(
    `/api/pets/${petId}/ai/summary?userId=${encodeURIComponent(userId)}&range=${range}`,
    {},
    AI_REQUEST_TIMEOUT_MS,
  );

export interface ChatSource {
  type: string;
  label: string;
  recordId?: string | null;
  occurredAt?: string | null;
}
export interface ChatKnowledgeSource {
  title: string;
  documentTitle: string;
  section: string;
  url: string;
}
export interface ChatHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}
export interface AIDataConsent {
  accepted: boolean;
  version?: string | null;
  acceptedAt?: string | null;
  currentVersion: string;
}
export const getAIDataConsent = (userId: string) =>
  apiData<AIDataConsent>(`/api/ai/data-consent?userId=${encodeURIComponent(userId)}`);
export const acceptAIDataConsent = (userId: string) =>
  apiData<AIDataConsent>(`/api/ai/data-consent?userId=${encodeURIComponent(userId)}`, {
    method: 'POST',
  });
export const getAIUsage = (userId: string, signal?: AbortSignal) => {
  const path = `/api/ai/usage?userId=${encodeURIComponent(userId)}`;
  return signal ? apiData<AIUsage>(path, { signal }) : apiData<AIUsage>(path);
};

export interface AIUsageHistory {
  periodDays: number;
  startDate: string;
  endDate: string;
  totalUsed: number;
  dailyUsage: { date: string; used: number }[];
}
export const getAIUsageHistory = (userId: string, days = 7, signal?: AbortSignal) => {
  const path = `/api/ai/usage/history?userId=${encodeURIComponent(userId)}&days=${days}`;
  return signal ? apiData<AIUsageHistory>(path, { signal }) : apiData<AIUsageHistory>(path);
};

export interface AIUsage {
  dailyLimit: number | null;
  used: number;
  remaining: number | null;
  unlimited?: boolean;
  tokensUsed: number;
  date: string;
}
export interface ChatResponse {
  answer: string;
  intent: string;
  sources: ChatSource[];
  knowledgeSources?: ChatKnowledgeSource[];
  fallbackUsed: boolean;
  provider: string;
  model?: string | null;
  generationMode: string;
  contextTokens?: number | null;
  conversationId?: string | null;
  suggestions: string[];
  usage?: AIUsage;
  errorCode?: string;
  errorMessage?: string;
}
export const sendAIChat = (
  userId: string,
  petId: string,
  message: string,
  range = 30,
  conversationId?: string,
  role = 'general',
  history: ChatHistoryTurn[] = [],
) =>
  apiData<ChatResponse>(
    `/api/pets/${petId}/ai/chat?userId=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        message,
        range,
        conversationId,
        role,
        history: history.slice(-10).map((turn) => ({
          ...turn,
          content: turn.content.slice(-1000),
        })),
      }),
      headers: { 'Content-Type': 'application/json' },
    },
    AI_CHAT_TIMEOUT_MS,
  );

export type VetBriefSection =
  | 'health'
  | 'weight'
  | 'daily'
  | 'medications'
  | 'medical'
  | 'vaccinations'
  | 'dewormings'
  | 'reminders';
export interface VetWeightPoint {
  measuredAt: string;
  weightKg: number;
}
export interface VetHealthEvent {
  id: string;
  type: string;
  occurredAt: string;
  severity: string;
  summary: string;
  notes?: string;
}
export interface VetMedication {
  name: string;
  instructions?: string;
  timesPerDay?: number;
  startDate?: string;
  endDate?: string;
  mealTiming?: string;
}
export interface VetMedicalVisit {
  id: string;
  visitedAt: string;
  reason: string;
  clinicName?: string;
  treatmentNotes?: string;
  followUpAt?: string;
}
export interface VetReminder {
  title: string;
  scheduledAt: string;
}
export interface VetNarrative {
  overview: string;
  timeline: string[];
  questions: string[];
  dataGaps: string[];
}
export interface VetVisitBrief {
  pet: {
    name?: string;
    breed?: string;
    sex?: string;
    birthDate?: string;
    isNeutered?: boolean;
    allergies?: string;
    chronicDiseases?: string;
  };
  period: { days: number; startAt: string; endAt: string };
  keyObservations: string[];
  weightSummary: {
    latestWeightKg?: number | null;
    previousWeightKg?: number | null;
    differenceKg?: number | null;
    recordCount: number;
    series: VetWeightPoint[];
  };
  dailyLogSummary: {
    recordCount: number;
    water?: { latest?: string };
    food?: { latest?: string };
    energy?: { latest?: string };
    stool?: { latest?: string };
  };
  recentHealthEvents: VetHealthEvent[];
  activeMedications: VetMedication[];
  recentMedicalVisits: VetMedicalVisit[];
  vaccination: {
    latest?: { vaccineName?: string; administeredAt?: string; nextDueAt?: string } | null;
  };
  deworming: {
    latest?: {
      type?: string;
      productName?: string;
      administeredAt?: string;
      nextDueAt?: string;
    } | null;
  };
  monitorAlerts: HealthMonitorAlert[];
  dataCoverage: Record<string, number>;
  aiNarrative: VetNarrative | null;
  disclaimer: string;
  generatedAt: string;
  generationMode: 'deterministic' | 'llm' | 'fallback';
  sources: ChatSource[];
  scopeNotes: string[];
  vetQuestions: string[];
  upcomingReminders: VetReminder[];
}
export const getVetVisitBrief = (
  userId: string,
  petId: string,
  range = 7,
  includeNarrative = false,
  sections: VetBriefSection[] = [],
  signal?: AbortSignal,
) => {
  const selected = sections.length ? `&sections=${encodeURIComponent(sections.join(','))}` : '';
  const path = `/api/pets/${petId}/ai/vet-brief?userId=${encodeURIComponent(userId)}&range=${range}&includeNarrative=${includeNarrative}${selected}`;
  const timeout = includeNarrative ? AI_VET_BRIEF_TIMEOUT_MS : AI_REQUEST_TIMEOUT_MS;
  return signal
    ? apiData<VetVisitBrief>(path, { signal }, timeout)
    : apiData<VetVisitBrief>(path, {}, timeout);
};
