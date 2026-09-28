/** 用途：疫苗表單型別、預設值與日期防呆。 */
export type VaccinationDraft = {
  vaccineName: string;
  administeredAt: string;
  hospitalName: string;
  nextDueAt: string;
  notes: string;
  createReminder: boolean;
  attachmentIds?: string[];
  [key: string]: string | boolean | string[] | undefined;
};

export const validVaccinationDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) || date.getFullYear() < 2000 ? undefined : date;
};

export const createBlankVaccinationDraft = (): VaccinationDraft => ({
  vaccineName: '',
  administeredAt: new Date().toISOString(),
  hospitalName: '',
  nextDueAt: '',
  notes: '',
  createReminder: false,
});
