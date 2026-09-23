export const GENDERS = ['girl', 'boy', 'unspecified'] as const;
export type Gender = (typeof GENDERS)[number];

export const ICONS = [
  'moon',
  'star',
  'bear',
  'fox',
  'owl',
  'cloud',
  'sun',
  'leaf',
] as const;
export type IconId = (typeof ICONS)[number];

export type KidId = string & { readonly __brand: 'KidId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type DayKey = string & { readonly __brand: 'DayKey' };

export function asKidId(value: string): KidId {
  return value as KidId;
}

export function asSessionId(value: string): SessionId {
  return value as SessionId;
}

export function asDayKey(value: string): DayKey {
  return value as DayKey;
}

export type SleepKind = 'nap' | 'night';

export type Kid = {
  id: KidId;
  name: string;
  gender: Gender;
  birthday: DayKey;
  icon: IconId;
};

export type SleepSession = {
  id: SessionId;
  kidId: KidId;
  kind: SleepKind;
  startedAt: string;
  endedAt: string | null;
};

export type Fit = 'under' | 'enough' | 'over' | 'unknown';

export type Recommendation = {
  minHours: number;
  maxHours: number;
  label: string;
};

export type DaySummary = {
  day: DayKey;
  nightMinutes: number;
  napMinutes: number;
  totalMinutes: number;
  sessions: SleepSession[];
};

export type PeriodBar = {
  label: string;
  start: DayKey;
  averageMinutes: number | null;
  loggedDays: number;
  fit: Fit;
};

export function isGender(value: string): value is Gender {
  return (GENDERS as readonly string[]).includes(value);
}

export function isIcon(value: string): value is IconId {
  return (ICONS as readonly string[]).includes(value);
}

export function isSleepKind(value: string): value is SleepKind {
  return value === 'nap' || value === 'night';
}
