import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { SleepLog } from '../storage/db';
import { openSleepLog } from '../storage/expoDb';

type SleepState = {
  log: SleepLog;
  revision: number;
  refresh: () => void;
};

const SleepContext = createContext<SleepState | null>(null);

export function SleepProvider({ children }: { children: ReactNode }) {
  const [log, setLog] = useState<SleepLog | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    openSleepLog()
      .then((opened) => {
        if (alive) {
          setLog(opened);
        }
      })
      .catch((error: unknown) => {
        console.error(error);
      });
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(() => {
    if (!log) {
      return null;
    }
    return {
      log,
      revision,
      refresh: () => setRevision((current) => current + 1),
    };
  }, [log, revision]);

  if (!value) {
    return null;
  }
  return (
    <SleepContext.Provider value={value}>{children}</SleepContext.Provider>
  );
}

export function useSleep(): SleepState {
  const value = useContext(SleepContext);
  if (!value) {
    throw new Error('useSleep must be used inside SleepProvider');
  }
  return value;
}
