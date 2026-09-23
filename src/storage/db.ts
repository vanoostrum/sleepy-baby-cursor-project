import type {
  DaySummary,
  Kid,
  KidId,
  PeriodBar,
  Recommendation,
  SessionId,
  SleepKind,
  SleepSession,
} from '../domain/model';
import { asKidId, asSessionId, isGender, isIcon } from '../domain/model';
import {
  RECOMMENDATION_SOURCE,
  recommendationForAge,
} from '../domain/recommend';
import {
  addDays,
  ageInMonths,
  dayKeyFromDate,
  dayStart,
  parseDayKey,
  periodBars,
  startOfMonth,
  startOfWeek,
  summarizeDay,
} from '../domain/summary';

export type SqlValue = string | number | null;
export type SqlParams = Record<string, SqlValue>;

export interface SqlDb {
  exec(sql: string): void;
  run(sql: string, params?: SqlParams): void;
  all(sql: string, params?: SqlParams): Record<string, SqlValue>[];
  get(sql: string, params?: SqlParams): Record<string, SqlValue> | undefined;
}

export type StoreError =
  | 'empty-name'
  | 'long-name'
  | 'future-birthday'
  | 'bad-birthday'
  | 'bad-gender'
  | 'bad-icon'
  | 'bad-day'
  | 'bad-time'
  | 'already-asleep'
  | 'not-asleep'
  | 'bad-range'
  | 'missing-session'
  | 'missing-kid';

export type StoreResult<T> =
  { ok: true; value: T } | { ok: false; error: StoreError };

export type NewKid = {
  name: string;
  gender: string;
  birthday: string;
  icon: string;
};

export type SessionPatch = {
  kind: SleepKind;
  startedAt: string;
  endedAt: string | null;
};

export type Histogram = {
  bars: PeriodBar[];
  recommendation: Recommendation;
  source: string;
};

export type SleepLog = {
  listKids(): Kid[];
  activeKid(): Kid | null;
  addKid(input: NewKid): StoreResult<Kid>;
  setActiveKid(id: KidId): StoreResult<Kid>;
  openSession(kidId: KidId): SleepSession | null;
  startSleep(kidId: KidId, kind: SleepKind): StoreResult<SleepSession>;
  stopSleep(kidId: KidId): StoreResult<SleepSession>;
  day(kidId: KidId, day: string): StoreResult<DaySummary>;
  correctSession(id: SessionId, patch: SessionPatch): StoreResult<SleepSession>;
  removeSession(id: SessionId): StoreResult<SleepSession>;
  histogram(
    kidId: KidId,
    grain: 'week' | 'month',
    count: number,
  ): StoreResult<Histogram>;
};

const ACTIVE_KEY = 'activeKidId';

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS kids (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  birthday TEXT NOT NULL,
  icon TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  kid_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  FOREIGN KEY (kid_id) REFERENCES kids(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_open_session ON sessions(kid_id) WHERE ended_at IS NULL;
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

type SqlRow = Record<string, SqlValue>;

function ok<T>(value: T): StoreResult<T> {
  return { ok: true, value };
}

function fail<T>(error: StoreError): StoreResult<T> {
  return { ok: false, error };
}

function parseInstant(value: string): string | null {
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return null;
  }
  return new Date(time).toISOString();
}

function text(row: SqlRow, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

function readKid(row: SqlRow): Kid {
  const id = text(row, 'id');
  const name = text(row, 'name');
  const gender = text(row, 'gender');
  const birthdayText = text(row, 'birthday');
  const icon = text(row, 'icon');
  const birthday = birthdayText ? parseDayKey(birthdayText) : null;
  if (
    !id ||
    !name ||
    !gender ||
    !isGender(gender) ||
    !birthday ||
    !icon ||
    !isIcon(icon)
  ) {
    throw new Error(`Unreadable kid row ${id ?? 'unknown'}`);
  }
  return {
    id: asKidId(id),
    name,
    gender,
    birthday,
    icon,
  };
}

function readSession(row: SqlRow): SleepSession {
  const id = text(row, 'id');
  const kid = text(row, 'kid_id');
  const kind = text(row, 'kind');
  const startedAt = text(row, 'started_at');
  const endedAt = row.ended_at;
  if (!id || !kid || !startedAt || (kind !== 'nap' && kind !== 'night')) {
    throw new Error(`Unreadable session row ${id ?? 'unknown'}`);
  }
  if (endedAt !== null && typeof endedAt !== 'string') {
    throw new Error(`Unreadable session row ${id}`);
  }
  return {
    id: asSessionId(id),
    kidId: asKidId(kid),
    kind,
    startedAt,
    endedAt,
  };
}

export function createSleepLog(
  db: SqlDb,
  clock: () => Date,
  newId: () => string,
): SleepLog {
  db.exec(SCHEMA);

  function kidById(id: string): Kid | undefined {
    const row = db.get(
      'SELECT id, name, gender, birthday, icon FROM kids WHERE id = $id',
      {
        $id: id,
      },
    );
    return row ? readKid(row) : undefined;
  }

  function sessionById(id: string): SleepSession | undefined {
    const row = db.get(
      'SELECT id, kid_id, kind, started_at, ended_at FROM sessions WHERE id = $id',
      { $id: id },
    );
    return row ? readSession(row) : undefined;
  }

  function sessionsBetween(
    kidId: KidId,
    rangeStart: Date,
    rangeEnd: Date,
  ): SleepSession[] {
    return db
      .all(
        `SELECT id, kid_id, kind, started_at, ended_at
         FROM sessions
         WHERE kid_id = $kidId
           AND started_at < $rangeEnd
           AND (ended_at IS NULL OR ended_at >= $rangeStart)
         ORDER BY started_at`,
        {
          $kidId: kidId,
          $rangeStart: rangeStart.toISOString(),
          $rangeEnd: rangeEnd.toISOString(),
        },
      )
      .map(readSession);
  }

  return {
    listKids() {
      return db
        .all(
          'SELECT id, name, gender, birthday, icon FROM kids ORDER BY name, id',
        )
        .map(readKid);
    },

    activeKid() {
      const row = db.get('SELECT value FROM settings WHERE key = $key', {
        $key: ACTIVE_KEY,
      });
      const value = row ? text(row, 'value') : null;
      return value ? (kidById(value) ?? null) : null;
    },

    addKid(input) {
      const name = input.name.trim();
      if (!name) {
        return fail('empty-name');
      }
      if (name.length > 40) {
        return fail('long-name');
      }
      if (!isGender(input.gender)) {
        return fail('bad-gender');
      }
      if (!isIcon(input.icon)) {
        return fail('bad-icon');
      }
      const birthday = parseDayKey(input.birthday);
      if (!birthday) {
        return fail('bad-birthday');
      }
      if (birthday > dayKeyFromDate(clock())) {
        return fail('future-birthday');
      }
      const id = asKidId(newId());
      db.run(
        'INSERT INTO kids (id, name, gender, birthday, icon) VALUES ($id, $name, $gender, $birthday, $icon)',
        {
          $id: id,
          $name: name,
          $gender: input.gender,
          $birthday: birthday,
          $icon: input.icon,
        },
      );
      const active = db.get('SELECT value FROM settings WHERE key = $key', {
        $key: ACTIVE_KEY,
      });
      if (!active) {
        db.run('INSERT INTO settings (key, value) VALUES ($key, $value)', {
          $key: ACTIVE_KEY,
          $value: id,
        });
      }
      return ok({
        id,
        name,
        gender: input.gender,
        birthday,
        icon: input.icon,
      });
    },

    setActiveKid(id) {
      const kid = kidById(id);
      if (!kid) {
        return fail('missing-kid');
      }
      db.run(
        'INSERT INTO settings (key, value) VALUES ($key, $value) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        { $key: ACTIVE_KEY, $value: id },
      );
      return ok(kid);
    },

    openSession(kidId) {
      const row = db.get(
        `SELECT id, kid_id, kind, started_at, ended_at
         FROM sessions
         WHERE kid_id = $kidId AND ended_at IS NULL`,
        { $kidId: kidId },
      );
      return row ? readSession(row) : null;
    },

    startSleep(kidId, kind) {
      if (!kidById(kidId)) {
        return fail('missing-kid');
      }
      if (this.openSession(kidId)) {
        return fail('already-asleep');
      }
      const id = asSessionId(newId());
      const startedAt = clock().toISOString();
      db.run(
        'INSERT INTO sessions (id, kid_id, kind, started_at, ended_at) VALUES ($id, $kidId, $kind, $startedAt, NULL)',
        { $id: id, $kidId: kidId, $kind: kind, $startedAt: startedAt },
      );
      return ok({ id, kidId, kind, startedAt, endedAt: null });
    },

    stopSleep(kidId) {
      const open = this.openSession(kidId);
      if (!open) {
        return fail('not-asleep');
      }
      const endedAt = clock().toISOString();
      if (Date.parse(endedAt) <= Date.parse(open.startedAt)) {
        return fail('bad-range');
      }
      db.run('UPDATE sessions SET ended_at = $endedAt WHERE id = $id', {
        $endedAt: endedAt,
        $id: open.id,
      });
      return ok({ ...open, endedAt });
    },

    day(kidId, dayText) {
      const day = parseDayKey(dayText);
      if (!day) {
        return fail('bad-day');
      }
      if (!kidById(kidId)) {
        return fail('missing-kid');
      }
      const start = dayStart(day);
      const sessions = sessionsBetween(
        kidId,
        new Date(start.getTime() - 36 * 60 * 60 * 1000),
        addDays(start, 1),
      );
      return ok(summarizeDay(sessions, day, clock()));
    },

    correctSession(id, patch) {
      const existing = sessionById(id);
      if (!existing) {
        return fail('missing-session');
      }
      const startedAt = parseInstant(patch.startedAt);
      if (!startedAt) {
        return fail('bad-time');
      }
      let endedAt: string | null = null;
      if (patch.endedAt !== null) {
        endedAt = parseInstant(patch.endedAt);
        if (!endedAt) {
          return fail('bad-time');
        }
        if (Date.parse(endedAt) <= Date.parse(startedAt)) {
          return fail('bad-range');
        }
      } else if (
        this.openSession(existing.kidId)?.id !== existing.id &&
        this.openSession(existing.kidId)
      ) {
        return fail('already-asleep');
      }
      db.run(
        'UPDATE sessions SET kind = $kind, started_at = $startedAt, ended_at = $endedAt WHERE id = $id',
        {
          $kind: patch.kind,
          $startedAt: startedAt,
          $endedAt: endedAt,
          $id: id,
        },
      );
      return ok({ ...existing, kind: patch.kind, startedAt, endedAt });
    },

    removeSession(id) {
      const existing = sessionById(id);
      if (!existing) {
        return fail('missing-session');
      }
      db.run('DELETE FROM sessions WHERE id = $id', { $id: id });
      return ok(existing);
    },

    histogram(kidId, grain, countArg) {
      const kid = kidById(kidId);
      if (!kid) {
        return fail('missing-kid');
      }
      const now = clock();
      const count = Math.max(1, Math.floor(countArg));
      const recommendation = recommendationForAge(
        ageInMonths(kid.birthday, now),
      );
      const rangeStart =
        grain === 'week'
          ? addDays(startOfWeek(now), -7 * (count - 1))
          : new Date(
              startOfMonth(now).getFullYear(),
              startOfMonth(now).getMonth() - (count - 1),
              1,
            );
      const rangeEnd =
        grain === 'week'
          ? addDays(startOfWeek(now), 7)
          : new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const sessions = sessionsBetween(
        kidId,
        new Date(rangeStart.getTime() - 36 * 60 * 60 * 1000),
        rangeEnd,
      );
      return ok({
        bars: periodBars({
          sessions,
          grain,
          count,
          anchor: now,
          recommendation,
          now,
        }),
        recommendation,
        source: RECOMMENDATION_SOURCE,
      });
    },
  };
}
