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
  linkedSourceType?: TimelineSourceType;
  linkedSourceId?: string;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
}
export interface TimelinePage {
  items: TimelineItem[];
  hasMore: boolean;
  nextSkip: number;
}

export interface TimelineCalendarDay {
  date: string;
  types: TimelineType[];
}

export interface TimelineCalendar {
  days: TimelineCalendarDay[];
}
