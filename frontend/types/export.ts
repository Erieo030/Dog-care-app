export type ExportFormat = 'pdf';
export type ExportScope = 'current_pet' | 'all_pets';
export type ExportPeriod = '30_days' | '90_days' | 'all' | 'custom';
export interface ExportRequest {
  format: ExportFormat;
  scope: ExportScope;
  petId?: string;
  period: ExportPeriod;
  startAt?: string;
  endAt?: string;
  includeAiSummary?: boolean;
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
