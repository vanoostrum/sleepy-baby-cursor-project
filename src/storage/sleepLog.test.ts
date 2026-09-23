import { createSleepLog, type SleepLog, type SqlDb } from './db';

import { DatabaseSync } from 'node:sqlite';

function memoryDb(): SqlDb {
  const database = new DatabaseSync(':memory:');
  return {
    exec(sql) {
      database.exec(sql);
    },
    run(sql, params = {}) {
      database.prepare(sql).run(params);
    },
    all(sql, params = {}) {
      return database.prepare(sql).all(params);
    },
    get(sql, params = {}) {
      return database.prepare(sql).get(params);
    },
  };
}

function openLog(now: string): {
  log: SleepLog;
  setNow: (iso: string) => void;
} {
  let current = now;
  let next = 0;
  const log = createSleepLog(
    memoryDb(),
    () => new Date(current),
    () => {
      next += 1;
      return `id-${next}`;
    },
  );
  return {
    log,
    setNow(iso) {
      current = iso;
    },
  };
}

const NOW = '2026-09-23T12:00:00.000Z';

test('stores a child and rejects a blank or future birthday', () => {
  const { log } = openLog(NOW);
  expect(
    log.addKid({
      name: '   ',
      gender: 'girl',
      birthday: '2024-09-23',
      icon: 'moon',
    }),
  ).toEqual({
    ok: false,
    error: 'empty-name',
  });
  expect(
    log.addKid({
      name: 'Ada',
      gender: 'girl',
      birthday: '2026-09-24',
      icon: 'moon',
    }),
  ).toEqual({
    ok: false,
    error: 'future-birthday',
  });
  const added = log.addKid({
    name: '  Ada  ',
    gender: 'girl',
    birthday: '2024-09-23',
    icon: 'moon',
  });
  expect(added).toEqual({
    ok: true,
    value: {
      id: 'id-1',
      name: 'Ada',
      gender: 'girl',
      birthday: '2024-09-23',
      icon: 'moon',
    },
  });
  expect(log.activeKid()).toEqual(added.ok ? added.value : null);
  expect(log.listKids()).toEqual([added.ok ? added.value : null]);
});

test('counts a night on the morning it ends and a nap on the day it starts', () => {
  const { log, setNow } = openLog('2026-09-22T19:00:00.000Z');
  const added = log.addKid({
    name: 'Ada',
    gender: 'girl',
    birthday: '2024-09-23',
    icon: 'bear',
  });
  if (!added.ok) {
    throw new Error(added.error);
  }
  expect(log.startSleep(added.value.id, 'night').ok).toBe(true);
  setNow('2026-09-23T07:00:00.000Z');
  expect(log.stopSleep(added.value.id)).toMatchObject({
    ok: true,
    value: { endedAt: '2026-09-23T07:00:00.000Z' },
  });
  setNow('2026-09-23T13:00:00.000Z');
  expect(log.startSleep(added.value.id, 'nap').ok).toBe(true);
  setNow('2026-09-23T15:00:00.000Z');
  expect(log.stopSleep(added.value.id).ok).toBe(true);

  expect(log.day(added.value.id, '2026-09-22')).toMatchObject({
    ok: true,
    value: { nightMinutes: 0, napMinutes: 0, totalMinutes: 0, sessions: [] },
  });
  expect(log.day(added.value.id, '2026-09-23')).toMatchObject({
    ok: true,
    value: { nightMinutes: 12 * 60, napMinutes: 2 * 60, totalMinutes: 14 * 60 },
  });
});

test('refuses a second sleep while one is still open', () => {
  const { log } = openLog('2026-09-23T13:00:00.000Z');
  const added = log.addKid({
    name: 'Ada',
    gender: 'boy',
    birthday: '2024-01-02',
    icon: 'fox',
  });
  if (!added.ok) {
    throw new Error(added.error);
  }
  expect(log.startSleep(added.value.id, 'nap')).toMatchObject({ ok: true });
  expect(log.startSleep(added.value.id, 'night')).toEqual({
    ok: false,
    error: 'already-asleep',
  });
  expect(
    log.day(added.value.id, '2026-09-23').ok &&
      log.day(added.value.id, '2026-09-23'),
  ).toMatchObject({
    ok: true,
    value: { sessions: [{ kind: 'nap' }] },
  });
});

test('corrects and removes a session', () => {
  const { log, setNow } = openLog('2026-09-23T13:00:00.000Z');
  const added = log.addKid({
    name: 'Ada',
    gender: 'unspecified',
    birthday: '2023-09-23',
    icon: 'owl',
  });
  if (!added.ok) {
    throw new Error(added.error);
  }
  const started = log.startSleep(added.value.id, 'nap');
  if (!started.ok) {
    throw new Error(started.error);
  }
  setNow('2026-09-23T15:00:00.000Z');
  expect(log.stopSleep(added.value.id).ok).toBe(true);
  const corrected = log.correctSession(started.value.id, {
    kind: 'nap',
    startedAt: '2026-09-23T13:00:00.000Z',
    endedAt: '2026-09-23T14:00:00.000Z',
  });
  expect(corrected.ok).toBe(true);
  expect(log.day(added.value.id, '2026-09-23')).toMatchObject({
    ok: true,
    value: { napMinutes: 60, totalMinutes: 60 },
  });
  expect(log.removeSession(started.value.id).ok).toBe(true);
  expect(log.day(added.value.id, '2026-09-23')).toMatchObject({
    ok: true,
    value: { totalMinutes: 0, sessions: [] },
  });
});

test('keeps a child after the log is opened again on the same database', () => {
  const database = memoryDb();
  const ids = { next: 0 };
  const make = () =>
    createSleepLog(
      database,
      () => new Date(NOW),
      () => {
        ids.next += 1;
        return `id-${ids.next}`;
      },
    );
  const first = make();
  expect(
    first.addKid({
      name: 'Ada',
      gender: 'girl',
      birthday: '2024-09-23',
      icon: 'star',
    }).ok,
  ).toBe(true);
  const second = make();
  expect(second.listKids().map((kid) => kid.name)).toEqual(['Ada']);
  expect(second.activeKid()?.name).toBe('Ada');
});

test('marks weekly and monthly averages against the age range', () => {
  const { log, setNow } = openLog('2026-09-22T13:00:00.000Z');
  const added = log.addKid({
    name: 'Ada',
    gender: 'girl',
    birthday: '2024-09-23',
    icon: 'cloud',
  });
  if (!added.ok) {
    throw new Error(added.error);
  }
  expect(log.startSleep(added.value.id, 'nap').ok).toBe(true);
  setNow('2026-09-22T21:00:00.000Z');
  expect(log.stopSleep(added.value.id).ok).toBe(true);
  setNow('2026-09-22T19:00:00.000Z');
  expect(log.startSleep(added.value.id, 'night').ok).toBe(true);
  setNow('2026-09-23T07:00:00.000Z');
  expect(log.stopSleep(added.value.id).ok).toBe(true);

  const week = log.histogram(added.value.id, 'week', 2);
  if (!week.ok) {
    throw new Error(week.error);
  }
  expect(week.value.recommendation).toEqual({
    minHours: 11,
    maxHours: 14,
    label: '1 to 2 years',
  });
  expect(week.value.source).toContain('Paruthi et al., 2016');
  expect(week.value.bars).toEqual([
    {
      label: 'Sep 14',
      start: '2026-09-14',
      averageMinutes: null,
      loggedDays: 0,
      fit: 'unknown',
    },
    {
      label: 'Sep 21',
      start: '2026-09-21',
      averageMinutes: 600,
      loggedDays: 2,
      fit: 'under',
    },
  ]);

  const month = log.histogram(added.value.id, 'month', 2);
  if (!month.ok) {
    throw new Error(month.error);
  }
  expect(month.value.bars[1]).toEqual({
    label: 'Sep 2026',
    start: '2026-09-01',
    averageMinutes: 600,
    loggedDays: 2,
    fit: 'under',
  });
});

test('calls an in-range day enough and a long day too much', () => {
  const { log, setNow } = openLog('2026-09-22T19:00:00.000Z');
  const added = log.addKid({
    name: 'Bea',
    gender: 'girl',
    birthday: '2024-09-23',
    icon: 'leaf',
  });
  if (!added.ok) {
    throw new Error(added.error);
  }
  expect(log.startSleep(added.value.id, 'night').ok).toBe(true);
  setNow('2026-09-23T07:00:00.000Z');
  expect(log.stopSleep(added.value.id).ok).toBe(true);
  const enough = log.histogram(added.value.id, 'week', 1);
  expect(enough.ok && enough.value.bars[0]?.fit).toBe('enough');
  expect(enough.ok && enough.value.bars[0]?.averageMinutes).toBe(12 * 60);

  const corrected = log.day(added.value.id, '2026-09-23');
  if (!corrected.ok) {
    throw new Error(corrected.error);
  }
  const session = corrected.value.sessions[0];
  if (!session) {
    throw new Error('missing session');
  }
  expect(
    log.correctSession(session.id, {
      kind: 'night',
      startedAt: '2026-09-22T19:00:00.000Z',
      endedAt: '2026-09-23T11:00:00.000Z',
    }).ok,
  ).toBe(true);
  const over = log.histogram(added.value.id, 'week', 1);
  expect(over.ok && over.value.bars[0]?.fit).toBe('over');
  expect(over.ok && over.value.bars[0]?.averageMinutes).toBe(16 * 60);
});
