/** 用途：集中管理跨畫面與 API Service 共用的產品資料型別。 */
export interface Pet {
  id: string;
  userId: string;
  name: string;
  species: 'dog' | 'cat' | 'other';
  gender: string;
  breed?: string;
  birthDate?: string;
  adoptionDate?: string;
  avatarUrl?: string;
  latestWeightKg?: number;
  latestWeightAt?: string;
  neutered: boolean;
  allergies?: string;
  chronicDiseases?: string;
  microchipNumber?: string;
  coatColor?: string;
  distinctiveFeatures?: string;
}
export type PetFormData = Omit<Pet, 'id' | 'userId' | 'species'>;

/** 建立與編輯毛孩表單的相容型別；欄位名稱保留後端 API convention。 */
export interface PetData {
  _id?: string;
  userId?: string;
  name: string;
  gender: string;
  breed: string;
  avatarUri: string;
  birthday: string;
  arrivalDate: string;
  neutered: boolean;
  allergies: string;
  chronicDiseases: string;
  microchipNumber: string;
  coatColor: string;
  distinctiveFeatures: string;
}

export const emptyPetData: PetData = {
  name: '',
  gender: '',
  breed: '',
  avatarUri: '',
  birthday: '',
  arrivalDate: '',
  neutered: false,
  allergies: '',
  chronicDiseases: '',
  microchipNumber: '',
  coatColor: '',
  distinctiveFeatures: '',
};
export type ReminderType =
  | 'vaccine'
  | 'deworming_internal'
  | 'deworming_external'
  | 'heartworm'
  | 'medication'
  | 'follow_up'
  | 'bath'
  | 'grooming'
  | 'restock'
  | 'other';
export type ReminderStatus = 'pending' | 'completed' | 'skipped' | 'snoozed';
export type RecurrenceRule =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'half_yearly'
  | 'yearly';
export interface Reminder {
  id: string;
  petId: string;
  type: ReminderType;
  title: string;
  scheduledAt: string;
  recurrenceRule: RecurrenceRule;
  status: ReminderStatus;
  notes?: string;
  completedAt?: string;
  sourceType?: 'medical_visit';
  sourceId?: string;
  createdAt?: string;
  updatedAt?: string;
}
export type ReminderInput = Pick<
  Reminder,
  'type' | 'title' | 'scheduledAt' | 'recurrenceRule' | 'notes'
> & { clientRequestId?: string };
export type ReminderUpdateInput = ReminderInput & Pick<Reminder, 'status'>;
export interface ReminderActionResult {
  reminder: Reminder;
  nextReminder?: Reminder | null;
  changed: boolean;
}
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
  storageProvider: 'local' | 'legacy_local' | string;
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
  imageUrls?: string[];
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
export type MedicalAttachmentType =
  | 'medication_bag'
  | 'receipt'
  | 'lab_report'
  | 'diagnosis_certificate'
  | 'medical_summary'
  | 'imaging_report'
  | 'other';
export interface MedicalAttachment {
  type: MedicalAttachmentType;
  fileUrl: string;
  fileName?: string;
}
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
  medicationNotes?: string;
  followUpAt?: string | null;
  cost?: number | null;
  notes?: string;
  attachments?: MedicalAttachment[];
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
export type TimelineType =
  | 'reminder_completed'
  | 'health_event'
  | 'weight'
  | 'medical_visit'
  | 'daily_log'
  | 'vaccination'
  | 'deworming'
  | 'medication'
  | 'life_event';
export type TimelineSourceType =
  | 'reminder'
  | 'health_event'
  | 'weight_record'
  | 'medical_visit'
  | 'daily_log'
  | 'vaccination'
  | 'deworming'
  | 'medication'
  | 'life_event';
export interface TimelineItem {
  id: string;
  petId: string;
  type: TimelineType;
  occurredAt: string;
  title: string;
  description?: string;
  sourceId: string;
  sourceType: TimelineSourceType;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
}
export interface TimelinePage {
  items: TimelineItem[];
  hasMore: boolean;
  nextSkip: number;
}
export interface DashboardWeightPoint {
  id: string;
  weightKg: number;
  measuredAt: string;
}
export interface DashboardHealthEvent {
  id: string;
  type: HealthEventType;
  summary: string;
  severity: Severity;
  occurredAt: string;
}
export interface DashboardMedicalVisit {
  id: string;
  visitedAt: string;
  clinicName: string;
  veterinarianName: string;
  reason: string;
}
export interface DashboardHealthCategories {
  digestive: number;
  skin: number;
  eye_ear: number;
  injury: number;
  other: number;
}
export interface HealthDashboard {
  pet: {
    id: string;
    name: string;
    breed: string;
    gender: string;
    birthDate: string;
    avatarUrl: string;
  };
  todayReminders: { items: Reminder[]; total: number; completed: number; pending: number };
  weight: {
    latest: DashboardWeightPoint | null;
    previous: DashboardWeightPoint | null;
    differenceKg: number | null;
    change: WeightChange;
    trend: DashboardWeightPoint[];
  };
  recentHealthEvents: DashboardHealthEvent[];
  recentMedicalVisit: DashboardMedicalVisit | null;
  currentMedications: { id: string; name: string; endDate: string }[];
  dailyLogTrends: {
    water: { id: string; loggedAt: string; waterLevel?: string }[];
    food: { id: string; loggedAt: string; foodLevel?: string }[];
    stool: { id: string; loggedAt: string; stoolLevel?: number }[];
    energy: { id: string; loggedAt: string; energyLevel?: string }[];
  };
  todayDailyLog: {
    waterLevel?: string;
    foodLevel?: string;
    energyLevel?: string;
    stoolLevel?: number;
  } | null;
  energySummary: { counts: Record<string, number>; total: number };
  recentVaccination: {
    id: string;
    vaccineName: string;
    administeredAt: string;
    nextDueAt?: string | null;
    hospitalName: string;
  } | null;
  statistics30Days: {
    healthEventCount: number;
    medicalVisitCount: number;
    reminderCount: number;
    reminderCompletedCount: number;
    reminderCompletionRate: number;
  };
  healthEventCategories30Days: DashboardHealthCategories;
  timeline: TimelineItem[];
  generatedAt: string;
}
export type SearchResultType =
  | 'weight'
  | 'health_event'
  | 'medical_visit'
  | 'reminder'
  | 'deworming'
  | 'medication';
export type SearchSort = 'newest' | 'oldest' | 'az' | 'za';
export type SearchAttachmentFilter = 'any' | 'with' | 'without';
export type SearchReminderStatus = 'any' | 'completed' | 'pending' | 'overdue';
export type SearchHealthCategory =
  | 'digestive'
  | 'skin'
  | 'respiratory'
  | 'eye'
  | 'injury'
  | 'other';
export interface SearchFilters {
  query: string;
  startAt?: string;
  endAt?: string;
  types: SearchResultType[];
  healthCategories: SearchHealthCategory[];
  clinic: string;
  veterinarian: string;
  minWeight?: number;
  maxWeight?: number;
  attachment: SearchAttachmentFilter;
  reminderStatus: SearchReminderStatus;
  sort: SearchSort;
}
export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  occurredAt: string;
  title: string;
  description: string;
  sourceId: string;
  sourceType: TimelineSourceType;
  attachmentCount: number;
  metadata: Record<string, string | number | null | undefined>;
}
export interface SearchPage {
  items: SearchResultItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}
export type ExportFormat = 'pdf' | 'csv' | 'json';
export type ExportScope = 'current_pet' | 'all_pets';
export type ExportPeriod = '30_days' | '90_days' | 'all' | 'custom';
export type CsvExportType =
  | 'weight'
  | 'health_event'
  | 'medical_visit'
  | 'reminder'
  | 'deworming'
  | 'medication';
export interface ExportRequest {
  format: ExportFormat;
  scope: ExportScope;
  petId?: string;
  period: ExportPeriod;
  startAt?: string;
  endAt?: string;
  csvType?: CsvExportType;
  includeImages: boolean;
}
export interface ExportJob {
  id: string;
  format: ExportFormat;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  fileName?: string;
  mimeType?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export type DailyWaterLevel = 'very_low' | 'low' | 'normal' | 'high' | 'very_high';
export type DailyEnergyLevel =
  | 'very_energetic'
  | 'normal'
  | 'slightly_low'
  | 'clearly_low'
  | 'very_low';
export type DailyPhysicalStatus =
  | 'normal'
  | 'heat'
  | 'period'
  | 'post_surgery'
  | 'pregnant'
  | 'other';
export interface DailyLog {
  id: string;
  petId: string;
  loggedAt: string;
  localDate: string;
  waterLevel?: DailyWaterLevel;
  foodLevel?: DailyWaterLevel;
  snack?: boolean;
  snackName?: string;
  snackNotes?: string;
  energyLevel?: DailyEnergyLevel;
  physicalStatus?: DailyPhysicalStatus;
  physicalStatusNote?: string;
  stoolLevel?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Vaccination {
  id: string;
  petId: string;
  vaccineName: string;
  administeredAt: string;
  hospitalName?: string;
  veterinarianName?: string;
  batchNumber?: string;
  manufacturer?: string;
  nextDueAt?: string | null;
  notes?: string;
  attachmentIds?: string[];
  reminderId?: string;
  createReminder?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type DewormingType = 'internal' | 'external' | 'heartworm' | 'other';
export interface Deworming {
  id: string;
  petId: string;
  type: DewormingType;
  productName: string;
  administeredAt: string;
  nextDueAt?: string | null;
  notes?: string;
  manufacturer?: string;
  dosageText?: string;
  administrationMethod?: string;
  hospitalName?: string;
  veterinarianName?: string;
  attachmentIds?: string[];
  reminderId?: string;
  createReminder?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type MedicationStatus = 'active' | 'completed' | 'stopped';
export type MedicationMealTiming = 'before_meal' | 'after_meal' | 'anytime';
export interface MedicationCourse {
  id: string;
  petId: string;
  medicalVisitId?: string | null;
  name: string;
  instructions?: string;
  timesPerDay: number;
  startDate: string;
  endDate?: string;
  mealTiming: MedicationMealTiming;
  notes?: string;
  status: MedicationStatus;
  reminderEnabled: boolean;
  reminderTimes: string[];
  createdAt?: string;
  updatedAt?: string;
}
