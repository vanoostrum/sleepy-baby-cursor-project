import * as SQLite from 'expo-sqlite';

import {
  createSleepLog,
  type SleepLog,
  type SqlDb,
  type SqlParams,
  type SqlValue,
} from './db';

function readRows(value: unknown): Record<string, SqlValue>[] {
  if (!Array.isArray(value)) {
    throw new Error('SQLite returned a non-array');
  }
  return value.map((row) => {
    if (row === null || typeof row !== 'object') {
      throw new Error('SQLite returned a non-object row');
    }
    const record: Record<string, SqlValue> = {};
    for (const [key, cell] of Object.entries(row)) {
      if (
        cell === null ||
        typeof cell === 'string' ||
        typeof cell === 'number'
      ) {
        record[key] = cell;
      } else {
        throw new Error(`SQLite returned an unreadable cell ${key}`);
      }
    }
    return record;
  });
}

export function openSleepLog(clock: () => Date = () => new Date()): SleepLog {
  const database = SQLite.openDatabaseSync('sleepy-baby.db');
  const db: SqlDb = {
    exec(sql) {
      database.execSync(sql);
    },
    run(sql, params: SqlParams = {}) {
      database.runSync(sql, params);
    },
    all(sql, params: SqlParams = {}) {
      return readRows(database.getAllSync(sql, params));
    },
    get(sql, params: SqlParams = {}) {
      return readRows(database.getAllSync(sql, params))[0];
    },
  };
  return createSleepLog(db, clock, () => crypto.randomUUID());
}
