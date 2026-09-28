export interface Vaccination {
  id: string;
  petId: string;
  vaccineName: string;
  administeredAt: string;
  hospitalName?: string;
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
  dosageText?: string;
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
