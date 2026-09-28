export type DailyWaterLevel = 'low' | 'normal' | 'high';
export type DailyEnergyLevel = 'normal' | 'slightly_low';
export type DailyStoolLevel = 'hard' | 'normal' | 'soft' | 'watery';
export interface DailyLog {
  id: string;
  petId: string;
  loggedAt: string;
  localDate: string;
  waterLevel?: DailyWaterLevel;
  foodLevel?: DailyWaterLevel;
  energyLevel?: DailyEnergyLevel;
  stoolLevel?: DailyStoolLevel;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
