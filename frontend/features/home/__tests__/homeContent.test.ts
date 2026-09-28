import { getHomeActionCategory } from '../homeContent';

test('home shortcuts map to the same semantic categories used by records', () => {
  expect(getHomeActionCategory('DailyLog')).toBe('daily');
  expect(getHomeActionCategory('AbnormalType')).toBe('health');
  expect(getHomeActionCategory('WeightForm')).toBe('weight');
  expect(getHomeActionCategory('CreateReminder')).toBe('reminder');
  expect(getHomeActionCategory('VaccinationForm')).toBe('care');
  expect(getHomeActionCategory('DewormingForm')).toBe('care');
  expect(getHomeActionCategory('MedicationForm')).toBe('care');
  expect(getHomeActionCategory('MedicalVisitForm')).toBe('care');
});
