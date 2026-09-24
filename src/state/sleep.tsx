import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { Kid } from '../domain/model';
import type { NewKid, SleepLog, StoreResult } from '../storage/db';
import { openSleepLog } from '../storage/expoDb';

type SleepState = {
  log: SleepLog | null;
  revision: number;
  refresh: () => void;
  remembered: Kid | null;
  rememberKid: (kid: Kid) => void;
  persistKid: (input: NewKid) => void;
  settleWrite: () => Promise<StoreResult<Kid>> | null;
};

const SleepContext = createContext<SleepState | null>(null);

function describeWriteError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function SleepProvider({ children }: { children: ReactNode }) {
  const [log, setLog] = useState<SleepLog | null>(null);
  const [revision, setRevision] = useState(0);
  const [remembered, setRemembered] = useState<Kid | null>(null);
  const queued = useRef<NewKid | null>(null);
  const writeRef = useRef<Promise<StoreResult<Kid>> | null>(null);

  const launchWrite = useCallback((current: SleepLog, input: NewKid) => {
    const write = current
      .addKid(input)
      .then((result) => {
        console.info(
          `kid-save write result: ${result.ok ? 'ok' : result.error}`,
        );
        if (result.ok) {
          setRemembered(result.value);
          setRevision((value) => value + 1);
        }
        return result;
      })
      .catch((error: unknown) => {
        console.info(`kid-save thrown: ${describeWriteError(error)}`);
        throw error;
      });
    writeRef.current = write;
  }, []);

  useEffect(() => {
    let alive = true;
    openSleepLog()
      .then((opened) => {
        if (alive) {
          setLog(opened);
        }
      })
      .catch((error: unknown) => {
        console.info(`kid-save thrown: ${describeWriteError(error)}`);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const input = queued.current;
    if (!log || !input || writeRef.current) {
      return;
    }
    queued.current = null;
    launchWrite(log, input);
  }, [launchWrite, log]);

  const value = useMemo(
    () => ({
      log,
      revision,
      refresh: () => setRevision((current) => current + 1),
      remembered,
      rememberKid: (kid: Kid) => setRemembered(kid),
      persistKid: (input: NewKid) => {
        if (log) {
          launchWrite(log, input);
          return;
        }
        queued.current = input;
      },
      settleWrite: () => writeRef.current,
    }),
    [launchWrite, log, revision, remembered],
  );

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
