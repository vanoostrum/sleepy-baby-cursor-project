import { formatLocalInput, parseLocalInput } from './local';

test('round-trips a local date and time', () => {
  const iso = parseLocalInput('2026-09-23 07:30');
  expect(iso).toBe('2026-09-23T07:30:00.000Z');
  expect(iso ? formatLocalInput(iso) : '').toBe('2026-09-23 07:30:00');
  expect(parseLocalInput('2026-09-23 07:30:15')).toBe(
    '2026-09-23T07:30:15.000Z',
  );
  expect(parseLocalInput('yesterday')).toBeNull();
  expect(parseLocalInput('2026-09-23 24:00')).toBeNull();
});
