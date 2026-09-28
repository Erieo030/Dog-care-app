export type ReminderType = 'vaccine' | 'deworming' | 'medication' | 'follow_up' | 'other';
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
  sourceType?: 'medical_visit' | 'vaccination' | 'deworming' | 'medication';
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
