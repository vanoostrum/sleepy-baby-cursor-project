import type {
  DayKey,
  DaySummary,
  PeriodBar,
  Recommendation,
  SleepSession,
} from './model';
import { asDayKey } from './model';
import { fitFor } from './recommend';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function parseDayKey(value: string): DayKey | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return asDayKey(value);
}

export function dayKeyFromDate(date: Date): DayKey {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return asDayKey(`${date.getFullYear()}-${month}-${day}`);
}

export function ageInMonths(birthday: DayKey, on: Date): number {
  const year = Number(birthday.slice(0, 4));
  const month = Number(birthday.slice(5, 7));
  const day = Number(birthday.slice(8, 10));
  let months = (on.getFullYear() - year) * 12 + (on.getMonth() + 1 - month);
  if (on.getDate() < day) {
    months -= 1;
  }
  return Math.max(0, months);
}

export function dayStart(day: DayKey): Date {
  return new Date(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)) - 1,
    Number(day.slice(8, 10)),
  );
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = start.getDay();
  const delta = weekday === 0 ? 6 : weekday - 1;
  start.setDate(start.getDate() - delta);
  return start;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function sessionMinutes(session: SleepSession, now: Date): number {
  const start = Date.parse(session.startedAt);
  const end =
    session.endedAt === null ? now.getTime() : Date.parse(session.endedAt);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }
  return Math.max(0, Math.round((end - start) / 60000));
}

export function attributedDay(session: SleepSession, now: Date): DayKey {
  if (session.kind === 'nap') {
    const started = new Date(session.startedAt);
    return dayKeyFromDate(Number.isNaN(started.getTime()) ? now : started);
  }
  const ended = session.endedAt === null ? now : new Date(session.endedAt);
  return dayKeyFromDate(Number.isNaN(ended.getTime()) ? now : ended);
}

export function summarizeDay(
  sessions: SleepSession[],
  day: DayKey,
  now: Date,
): DaySummary {
  const matched = sessions
    .filter((session) => attributedDay(session, now) === day)
    .sort((left, right) => left.startedAt.localeCompare(right.startedAt));
  let nightMinutes = 0;
  let napMinutes = 0;
  for (const session of matched) {
    const minutes = sessionMinutes(session, now);
    if (session.kind === 'night') {
      nightMinutes += minutes;
    } else {
      napMinutes += minutes;
    }
  }
  return {
    day,
    nightMinutes,
    napMinutes,
    totalMinutes: nightMinutes + napMinutes,
    sessions: matched,
  };
}

function weekLabel(start: Date): string {
  return `${MONTHS[start.getMonth()]} ${start.getDate()}`;
}

function monthLabel(start: Date): string {
  return `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
}

export function periodBars(args: {
  sessions: SleepSession[];
  grain: 'week' | 'month';
  count: number;
  anchor: Date;
  recommendation: Recommendation;
  now: Date;
}): PeriodBar[] {
  const count = Math.max(1, Math.floor(args.count));
  const buckets: { start: Date; end: Date; label: string }[] = [];
  if (args.grain === 'week') {
    const latest = startOfWeek(args.anchor);
    for (let index = count - 1; index >= 0; index -= 1) {
      const start = addDays(latest, -7 * index);
      buckets.push({ start, end: addDays(start, 7), label: weekLabel(start) });
    }
  } else {
    const latest = startOfMonth(args.anchor);
    for (let index = count - 1; index >= 0; index -= 1) {
      const start = new Date(
        latest.getFullYear(),
        latest.getMonth() - index,
        1,
      );
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      buckets.push({ start, end, label: monthLabel(start) });
    }
  }

  return buckets.map((bucket) => {
    const totals: number[] = [];
    for (
      let cursor = new Date(bucket.start);
      cursor < bucket.end;
      cursor = addDays(cursor, 1)
    ) {
      const summary = summarizeDay(
        args.sessions,
        dayKeyFromDate(cursor),
        args.now,
      );
      if (summary.sessions.length > 0) {
        totals.push(summary.totalMinutes);
      }
    }
    const loggedDays = totals.length;
    const averageMinutes =
      loggedDays === 0
        ? null
        : Math.round(
            totals.reduce((sum, value) => sum + value, 0) / loggedDays,
          );
    return {
      label: bucket.label,
      start: dayKeyFromDate(bucket.start),
      averageMinutes,
      loggedDays,
      fit: fitFor(averageMinutes, args.recommendation),
    };
  });
}
