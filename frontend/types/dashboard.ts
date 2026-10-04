import type { DailyEnergyLevel, DailyStoolLevel, DailyWaterLevel } from './daily';
import type { HealthEventType, Severity, WeightChange } from './health';
import type { Reminder } from './reminders';
import type { TimelineItem } from './timeline';
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
    avatarAttachmentId?: string;
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
    stool: { id: string; loggedAt: string; stoolLevel?: DailyStoolLevel }[];
    energy: { id: string; loggedAt: string; energyLevel?: string }[];
  };
  todayDailyLog: {
    id: string;
    waterLevel?: string;
    foodLevel?: string;
    energyLevel?: string;
    stoolLevel?: DailyStoolLevel;
  } | null;
  dailyRecords: {
    id: string;
    date: string;
    water?: DailyWaterLevel;
    food?: DailyWaterLevel;
    energy?: DailyEnergyLevel;
    stool?: DailyStoolLevel;
  }[];
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
