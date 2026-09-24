import { ageLabel } from './summary';

test('names an age the way a parent would say it', () => {
  expect(ageLabel(0)).toBe('0 months');
  expect(ageLabel(1)).toBe('1 month');
  expect(ageLabel(18)).toBe('18 months');
  expect(ageLabel(24)).toBe('2 years');
  expect(ageLabel(36)).toBe('3 years');
});
