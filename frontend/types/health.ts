import type { ReminderStatus } from './reminders';
export type HealthEventType =
  | 'vomiting'
  | 'abnormal_stool'
  | 'low_appetite'
  | 'abnormal_drinking'
  | 'low_energy'
  | 'injury'
  | 'skin_issue'
  | 'eye_ear_issue'
  | 'possible_ingestion'
  | 'other';
export type Severity = 'mild' | 'moderate' | 'severe';
export type VomitCount = 'once' | 'two_to_three' | 'four_or_more';
export type EnergyCondition = 'normal' | 'slightly_low' | 'very_low';
export type VomitColor =
  | 'transparent'
  | 'white'
  | 'yellow'
  | 'green'
  | 'brown'
  | 'red_or_blood'
  | 'other';
export type DrinkingCondition = 'normal' | 'vomits_after_drinking' | 'refuses' | 'unknown';
export interface VomitingDetails extends Record<string, unknown> {
  vomitCount: VomitCount;
  energyCondition: EnergyCondition;
  color?: VomitColor;
  hasFoam: boolean;
  hasFood: boolean;
  suspectedBlood: boolean;
  suspectedForeignObject: boolean;
  drinkingCondition?: DrinkingCondition;
}
export type StoolConsistency = 'soft' | 'watery' | 'hard' | 'other';
export type StoolColor = 'normal' | 'yellow' | 'green' | 'black' | 'red' | 'other';
export interface StoolDetails extends Record<string, unknown> {
  stoolConsistency: StoolConsistency;
  stoolColor: StoolColor;
  hasMucus: boolean;
  suspectedBlood: boolean;
  hasForeignObject: boolean;
  suspectedParasite: boolean;
}
export type ObservationHealthEventType = 'low_appetite' | 'low_energy' | 'abnormal_drinking';
export type AppetiteLevel = 'slightly_reduced' | 'less_than_half' | 'not_eating';
export type AppetiteDuration = 'one_meal' | 'within_half_day' | 'one_day' | 'over_one_day';
export type AssociatedSymptom = 'vomiting' | 'abnormal_stool' | 'reduced_drinking' | 'low_energy';
export interface AppetiteDetails extends Record<string, unknown> {
  appetiteLevel: AppetiteLevel;
  duration?: AppetiteDuration;
  associatedSymptoms: AssociatedSymptom[];
}
export type EnergyLevel = 'slightly_low' | 'clearly_low' | 'barely_active';
export type MovementCondition =
  | 'normal_movement'
  | 'reduced_movement'
  | 'reluctant_to_stand'
  | 'unknown';
export type ResponseCondition =
  | 'normal_response'
  | 'slow_response'
  | 'minimal_response'
  | 'unknown';
export interface LowEnergyDetails extends Record<string, unknown> {
  energyLevel: EnergyLevel;
  movementCondition?: MovementCondition;
  responseCondition?: ResponseCondition;
}
export type DrinkingLevel =
  | 'less_than_usual'
  | 'barely_drinking'
  | 'more_than_usual'
  | 'frequent_drinking';
export type DrinkingDuration = 'few_hours' | 'half_day' | 'one_day' | 'over_one_day';
export type DrinkingAbility = 'normal' | 'vomits_after_drinking' | 'unable_to_drink' | 'unknown';
export interface AbnormalDrinkingDetails extends Record<string, unknown> {
  drinkingLevel: DrinkingLevel;
  duration?: DrinkingDuration;
  drinkingAbility?: DrinkingAbility;
}
export type AttachmentSourceType = 'weight' | 'health_event' | 'medical_visit';
export interface Attachment {
  id: string;
  petId: string;
  sourceType?: AttachmentSourceType;
  sourceId?: string;
  storageProvider: 'local' | string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  contentPath: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface HealthEventInput {
  type: HealthEventType;
  occurredAt: string;
  severity: Severity;
  summary: string;
  details?: Record<string, unknown>;
  notes?: string;
  attachmentIds?: string[];
}
export interface HealthEvent extends HealthEventInput {
  id: string;
  petId: string;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
  attachmentCount?: number;
}
export interface WeightRecord {
  id: string;
  petId: string;
  weightKg: number;
  measuredAt: string;
  notes?: string;
  attachmentIds?: string[];
  attachments?: Attachment[];
  createdAt?: string;
  updatedAt?: string;
}
export type WeightChange = 'increased' | 'decreased' | 'unchanged' | null;
export interface WeightSummary {
  latestWeightKg: number | null;
  latestMeasuredAt: string | null;
  differenceKg: number | null;
  change: WeightChange;
}
export type WeightInput = Pick<WeightRecord, 'weightKg' | 'measuredAt' | 'notes' | 'attachmentIds'>;
export interface Medication {
  name: string;
  instructions: string;
  timesPerDay: number;
  startDate: string;
  endDate: string;
  mealTiming: 'before' | 'after' | 'any';
  notes: string;
}
export interface MedicalVisitInput {
  clientRequestId?: string;
  visitedAt: string;
  reason: string;
  clinicName?: string;
  veterinarianName?: string;
  veterinarianNotes?: string;
  treatmentNotes?: string;
  followUpAt?: string | null;
  cost?: number | null;
  notes?: string;
  attachmentIds?: string[];
  medications?: Medication[];
  createFollowUpReminder?: boolean;
}
export interface MedicalVisit extends Omit<MedicalVisitInput, 'attachments'> {
  attachments?: Attachment[];
  id: string;
  petId: string;
  createdAt?: string;
  updatedAt?: string;
  followUpReminderId?: string | null;
  followUpReminderStatus?: ReminderStatus | null;
}
