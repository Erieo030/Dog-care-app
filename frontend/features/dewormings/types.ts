/** 用途：驅蟲表單型別、顯示文字與日期防呆。 */
import type { DewormingType } from '../../types';

export type DewormingDraft = {
  type: DewormingType;
  productName: string;
  administeredAt: string;
  nextDueAt: string;
  notes: string;
  dosageText: string;
  createReminder: boolean;
  attachmentIds?: string[];
  [key: string]: string | boolean | string[] | DewormingType | undefined;
};

export const dewormingTypeLabels: Record<DewormingType, string> = {
  internal: '體內驅蟲',
  external: '體外驅蟲',
  heartworm: '心絲蟲預防',
  other: '其他',
};

export const validDewormingDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) || date.getFullYear() < 2000 ? undefined : date;
};

export const createBlankDewormingDraft = (): DewormingDraft => ({
  type: 'internal',
  productName: '',
  administeredAt: new Date().toISOString(),
  nextDueAt: '',
  notes: '',
  dosageText: '',
  createReminder: false,
});
