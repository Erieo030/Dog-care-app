const AI_REQUEST_TIMEOUT_MS = 45000;
import { apiData } from './api';
export interface HealthMonitorAlert { id:string; type:string; severity:'info'|'attention'|'urgent'; title:string; message:string; evidence:Record<string, unknown>; }
export interface HealthMonitorResult { period:{days:number;startAt:string;endAt:string}; alerts:HealthMonitorAlert[]; summary:{total:number;info:number;attention:number;urgent:number}; }
export const getHealthMonitor = (userId:string, petId:string, range=30) => apiData<HealthMonitorResult>(`/api/pets/${petId}/ai/health-monitor?userId=${encodeURIComponent(userId)}&range=${range}`, {}, AI_REQUEST_TIMEOUT_MS);

export interface HealthSummaryResponse {
  periodDays:number; headline:string; summary:string; highlights:string[]; attentionItems:string[]; upcomingCare:string[]; dataCoverage:string; disclaimer:string; provider:string; model?:string|null; actualModel?:string|null; generatedAt:string; fallbackUsed:boolean;
}
export const getHealthSummary = (userId:string, petId:string, range=30) => apiData<HealthSummaryResponse>(`/api/pets/${petId}/ai/summary?userId=${encodeURIComponent(userId)}&range=${range}`, {}, AI_REQUEST_TIMEOUT_MS);

export interface ChatSource { type:string; label:string; recordId?:string|null; occurredAt?:string|null; }
export const getAIUsage = (userId:string) => apiData<AIUsage>(`/api/ai/usage?userId=${encodeURIComponent(userId)}`);

export interface AIUsage { dailyLimit:number|null; used:number; remaining:number|null; unlimited?:boolean; tokensUsed:number; date:string; }
export interface ChatResponse { answer:string; intent:string; sources:ChatSource[]; fallbackUsed:boolean; provider:string; model?:string|null; generationMode:string; conversationId?:string|null; suggestions:string[]; usage?:AIUsage; errorCode?:string; errorMessage?:string; }
export const sendAIChat = (userId:string, petId:string, message:string, range=30, conversationId?:string, role='general') => apiData<ChatResponse>(`/api/pets/${petId}/ai/chat?userId=${encodeURIComponent(userId)}`, { method:'POST', body: JSON.stringify({ message, range, conversationId, role }), headers: { 'Content-Type':'application/json' } }, AI_REQUEST_TIMEOUT_MS);

export interface VetVisitBrief { pet:Record<string,unknown>; period:{days:number;startAt:string;endAt:string}; keyObservations:string[]; weightSummary:Record<string,unknown>; dailyLogSummary:Record<string,unknown>; recentHealthEvents:Record<string,unknown>[]; activeMedications:Record<string,unknown>[]; recentMedicalVisits:Record<string,unknown>[]; vaccination:Record<string,unknown>; deworming:Record<string,unknown>; monitorAlerts:Record<string,unknown>[]; dataCoverage:Record<string,number>; generatedSummary:string; disclaimer:string; generatedAt:string; generationMode:string; sources:ChatSource[]; }
export const getVetVisitBrief = (userId:string, petId:string, range=7) => apiData<VetVisitBrief>(`/api/pets/${petId}/ai/vet-brief?userId=${encodeURIComponent(userId)}&range=${range}`, {}, AI_REQUEST_TIMEOUT_MS);
