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
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParams): Promise<void>;
  all(sql: string, params?: SqlParams): Promise<Record<string, SqlValue>[]>;
  get(
    sql: string,
    params?: SqlParams,
  ): Promise<Record<string, SqlValue> | undefined>;
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
  listKids(): Promise<Kid[]>;
  activeKid(): Promise<Kid | null>;
  addKid(input: NewKid): Promise<StoreResult<Kid>>;
  setActiveKid(id: KidId): Promise<StoreResult<Kid>>;
  openSession(kidId: KidId): Promise<SleepSession | null>;
  startSleep(kidId: KidId, kind: SleepKind): Promise<StoreResult<SleepSession>>;
  stopSleep(kidId: KidId): Promise<StoreResult<SleepSession>>;
  day(kidId: KidId, day: string): Promise<StoreResult<DaySummary>>;
  correctSession(
    id: SessionId,
    patch: SessionPatch,
  ): Promise<StoreResult<SleepSession>>;
  removeSession(id: SessionId): Promise<StoreResult<SleepSession>>;
  histogram(
    kidId: KidId,
    grain: 'week' | 'month',
    count: number,
  ): Promise<StoreResult<Histogram>>;
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

export function previewNewKid(
  input: NewKid,
  today: ReturnType<typeof dayKeyFromDate>,
): StoreResult<Omit<Kid, 'id'>> {
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
  if (birthday > today) {
    return fail('future-birthday');
  }
  return ok({
    name,
    gender: input.gender,
    birthday,
    icon: input.icon,
  });
}

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

export async function createSleepLog(
  db: SqlDb,
  clock: () => Date,
  newId: () => string,
): Promise<SleepLog> {
  await db.exec(SCHEMA);

  async function kidById(id: string): Promise<Kid | undefined> {
    const row = await db.get(
      'SELECT id, name, gender, birthday, icon FROM kids WHERE id = $id',
      {
        $id: id,
      },
    );
    return row ? readKid(row) : undefined;
  }

  async function sessionById(id: string): Promise<SleepSession | undefined> {
    const row = await db.get(
      'SELECT id, kid_id, kind, started_at, ended_at FROM sessions WHERE id = $id',
      { $id: id },
    );
    return row ? readSession(row) : undefined;
  }

  async function sessionsBetween(
    kidId: KidId,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<SleepSession[]> {
    const rows = await db.all(
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
    );
    return rows.map(readSession);
  }

  async function openSession(kidId: KidId): Promise<SleepSession | null> {
    const row = await db.get(
      `SELECT id, kid_id, kind, started_at, ended_at
       FROM sessions
       WHERE kid_id = $kidId AND ended_at IS NULL`,
      { $kidId: kidId },
    );
    return row ? readSession(row) : null;
  }

  return {
    async listKids() {
      const rows = await db.all(
        'SELECT id, name, gender, birthday, icon FROM kids ORDER BY name, id',
      );
      return rows.map(readKid);
    },

    async activeKid() {
      const row = await db.get('SELECT value FROM settings WHERE key = $key', {
        $key: ACTIVE_KEY,
      });
      const value = row ? text(row, 'value') : null;
      return value ? ((await kidById(value)) ?? null) : null;
    },

    async addKid(input) {
      const preview = previewNewKid(input, dayKeyFromDate(clock()));
      if (!preview.ok) {
        return preview;
      }
      const { name, gender, birthday, icon } = preview.value;
      const id = asKidId(newId());
      await db.run(
        'INSERT INTO kids (id, name, gender, birthday, icon) VALUES ($id, $name, $gender, $birthday, $icon)',
        {
          $id: id,
          $name: name,
          $gender: input.gender,
          $birthday: birthday,
          $icon: input.icon,
        },
      );
      const active = await db.get(
        'SELECT value FROM settings WHERE key = $key',
        {
          $key: ACTIVE_KEY,
        },
      );
      if (!active) {
        await db.run(
          'INSERT INTO settings (key, value) VALUES ($key, $value)',
          {
            $key: ACTIVE_KEY,
            $value: id,
          },
        );
      }
      return ok({
        id,
        name,
        gender,
        birthday,
        icon,
      });
    },

    async setActiveKid(id) {
      const kid = await kidById(id);
      if (!kid) {
        return fail('missing-kid');
      }
      await db.run(
        'INSERT INTO settings (key, value) VALUES ($key, $value) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        { $key: ACTIVE_KEY, $value: id },
      );
      return ok(kid);
    },

    openSession,

    async startSleep(kidId, kind) {
      if (!(await kidById(kidId))) {
        return fail('missing-kid');
      }
      if (await openSession(kidId)) {
        return fail('already-asleep');
      }
      const id = asSessionId(newId());
      const startedAt = clock().toISOString();
      await db.run(
        'INSERT INTO sessions (id, kid_id, kind, started_at, ended_at) VALUES ($id, $kidId, $kind, $startedAt, NULL)',
        { $id: id, $kidId: kidId, $kind: kind, $startedAt: startedAt },
      );
      return ok({ id, kidId, kind, startedAt, endedAt: null });
    },

    async stopSleep(kidId) {
      const open = await openSession(kidId);
      if (!open) {
        return fail('not-asleep');
      }
      let endedAt = clock().toISOString();
      if (Date.parse(endedAt) <= Date.parse(open.startedAt)) {
        endedAt = new Date(Date.parse(open.startedAt) + 1000).toISOString();
      }
      await db.run('UPDATE sessions SET ended_at = $endedAt WHERE id = $id', {
        $endedAt: endedAt,
        $id: open.id,
      });
      return ok({ ...open, endedAt });
    },

    async day(kidId, dayText) {
      const day = parseDayKey(dayText);
      if (!day) {
        return fail('bad-day');
      }
      if (!(await kidById(kidId))) {
        return fail('missing-kid');
      }
      const start = dayStart(day);
      const sessions = await sessionsBetween(
        kidId,
        new Date(start.getTime() - 36 * 60 * 60 * 1000),
        addDays(start, 1),
      );
      return ok(summarizeDay(sessions, day, clock()));
    },

    async correctSession(id, patch) {
      const existing = await sessionById(id);
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
      } else {
        const open = await openSession(existing.kidId);
        if (open && open.id !== existing.id) {
          return fail('already-asleep');
        }
      }
      await db.run(
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

    async removeSession(id) {
      const existing = await sessionById(id);
      if (!existing) {
        return fail('missing-session');
      }
      await db.run('DELETE FROM sessions WHERE id = $id', { $id: id });
      return ok(existing);
    },

    async histogram(kidId, grain, countArg) {
      const kid = await kidById(kidId);
      if (!kid) {
        return fail('missing-kid');
      }
      const now = clock();
      const count = Math.max(1, Math.floor(countArg));
      const recommendation = recommendationForAge(
        ageInMonths(kid.birthday, now),
      );
      const weekStart = startOfWeek(now);
      const monthStart = startOfMonth(now);
      const rangeStart =
        grain === 'week'
          ? addDays(weekStart, -7 * (count - 1))
          : new Date(
              monthStart.getFullYear(),
              monthStart.getMonth() - (count - 1),
              1,
            );
      const rangeEnd =
        grain === 'week'
          ? addDays(weekStart, 7)
          : new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const sessions = await sessionsBetween(
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
