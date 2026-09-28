import { Medication } from '../../types';

export const emptyMedication = (): Medication => ({
  name: '',
  instructions: '',
  timesPerDay: 1,
  startDate: '',
  endDate: '',
  mealTiming: 'any',
  notes: '',
});

export const formatLocalDate = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
    value.getDate(),
  ).padStart(2, '0')}`;

export const parseLocalDate = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};
