import type { StoreError } from '../storage/db';

const COPY: Record<StoreError, string> = {
  'empty-name': 'Enter a name.',
  'long-name': 'Use 40 characters or fewer.',
  'future-birthday': 'That birthday is in the future.',
  'bad-birthday': 'Enter a real birthday.',
  'bad-gender': 'Choose girl, boy, or skip.',
  'bad-icon': 'Choose an icon.',
  'bad-day': 'That day is not a real date.',
  'bad-time': 'Enter a real time.',
  'already-asleep': 'Sleep is already running.',
  'not-asleep': 'No sleep is running.',
  'bad-range': 'The end has to be after the start.',
  'missing-session': 'That sleep record is gone.',
  'missing-kid': 'Choose a child first.',
};

export function errorCopy(error: StoreError): string {
  return COPY[error];
}
