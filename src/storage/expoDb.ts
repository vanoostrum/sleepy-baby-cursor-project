import * as SQLite from 'expo-sqlite';

import {
  createSleepLog,
  type SleepLog,
  type SqlDb,
  type SqlParams,
  type SqlValue,
} from './db';
import { localId } from './localId';

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

export async function openSleepLog(
  clock: () => Date = () => new Date(),
): Promise<SleepLog> {
  const database = await SQLite.openDatabaseAsync('sleepy-baby.db');
  const db: SqlDb = {
    async exec(sql) {
      await database.execAsync(sql);
    },
    async run(sql, params: SqlParams = {}) {
      await database.runAsync(sql, params);
    },
    async all(sql, params: SqlParams = {}) {
      return readRows(await database.getAllAsync(sql, params));
    },
    async get(sql, params: SqlParams = {}) {
      return readRows(await database.getAllAsync(sql, params))[0];
    },
  };
  return createSleepLog(db, clock, localId);
}
