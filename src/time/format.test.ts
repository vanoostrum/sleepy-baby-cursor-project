import { formatDuration } from './format';

test('formats a duration in hours and minutes', () => {
  expect(formatDuration(0)).toBe('0m');
  expect(formatDuration(45)).toBe('45m');
  expect(formatDuration(90)).toBe('1h 30m');
  expect(formatDuration(120)).toBe('2h');
  expect(formatDuration(59.6)).toBe('1h');
});
