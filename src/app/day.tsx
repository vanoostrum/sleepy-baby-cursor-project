import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { asSessionId, type DaySummary, type SleepKind } from '../domain/model';
import { addDays, dayKeyFromDate, dayStart } from '../domain/summary';
import { useSleep } from '../state/sleep';
import { formatDuration } from '../time/format';
import { formatLocalInput, parseLocalInput } from '../time/local';
import { errorCopy } from '../ui/errors';
import { Screen, Title } from '../ui/screen';

export default function DayScreen() {
  const { log, revision, refresh } = useSleep();
  const [day, setDay] = useState(() => dayKeyFromDate(new Date()));
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [kind, setKind] = useState<SleepKind>('nap');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!log) {
      return;
    }
    let alive = true;
    (async () => {
      const kid = await log.activeKid();
      if (!kid) {
        if (alive) setSummary(null);
        return;
      }
      const result = await log.day(kid.id, day);
      if (alive) setSummary(result.ok ? result.value : null);
    })();
    return () => {
      alive = false;
    };
  }, [log, revision, day]);

  function shift(delta: number) {
    setEditing(null);
    setDay(dayKeyFromDate(addDays(dayStart(day), delta)));
  }

  async function save() {
    if (!log || !editing) return;
    const startedAt = parseLocalInput(start);
    const endedAt = end.trim() === '' ? null : parseLocalInput(end);
    if (!startedAt || (end.trim() !== '' && !endedAt)) {
      setError('Use a time like 2026-09-23 07:30.');
      return;
    }
    const result = await log.correctSession(asSessionId(editing), {
      kind,
      startedAt,
      endedAt,
    });
    if (!result.ok) {
      setError(errorCopy(result.error));
      return;
    }
    setEditing(null);
    setError('');
    refresh();
  }

  return (
    <Screen testID="day-screen">
      <ScrollView testID="day-list">
        <Pressable testID="back-home" onPress={() => router.back()}>
          <Text style={styles.back}>Home</Text>
        </Pressable>
        <Title>Day</Title>
        <View style={styles.nav}>
          <Pressable testID="day-prev" onPress={() => shift(-1)}>
            <Text style={styles.navLabel}>Previous</Text>
          </Pressable>
          <Text testID="day-label" style={styles.day}>
            {day}
          </Text>
          <Pressable testID="day-next" onPress={() => shift(1)}>
            <Text style={styles.navLabel}>Next</Text>
          </Pressable>
        </View>
        <Text testID="day-total" style={styles.total}>
          {formatDuration(summary?.totalMinutes ?? 0)}
        </Text>
        <Text testID="day-night" style={styles.split}>
          Night {formatDuration(summary?.nightMinutes ?? 0)}
        </Text>
        <Text testID="day-nap" style={styles.split}>
          Nap {formatDuration(summary?.napMinutes ?? 0)}
        </Text>
        {(summary?.sessions ?? []).map((session) => (
          <View
            key={session.id}
            style={styles.row}
            testID={`session-${session.id}`}
          >
            <Text style={styles.kind}>
              {session.kind === 'night' ? 'Night' : 'Nap'}
            </Text>
            <Text style={styles.when}>
              {formatLocalInput(session.startedAt)}
              {session.endedAt
                ? ` to ${formatLocalInput(session.endedAt)}`
                : ' still going'}
            </Text>
            <View style={styles.rowActions}>
              <Pressable
                testID={`edit-${session.id}`}
                onPress={() => {
                  setEditing(session.id);
                  setKind(session.kind);
                  setStart(formatLocalInput(session.startedAt));
                  setEnd(
                    session.endedAt ? formatLocalInput(session.endedAt) : '',
                  );
                  setError('');
                }}
              >
                <Text style={styles.action}>Edit</Text>
              </Pressable>
              <Pressable
                testID={`delete-${session.id}`}
                onPress={() => {
                  void log?.removeSession(session.id).then(() => refresh());
                }}
              >
                <Text style={styles.delete}>Remove</Text>
              </Pressable>
            </View>
            {editing === session.id ? (
              <View>
                <View style={styles.kinds}>
                  <Pressable testID="edit-nap" onPress={() => setKind('nap')}>
                    <Text
                      style={kind === 'nap' ? styles.kindOn : styles.kindOff}
                    >
                      Nap
                    </Text>
                  </Pressable>
                  <Pressable
                    testID="edit-night"
                    onPress={() => setKind('night')}
                  >
                    <Text
                      style={kind === 'night' ? styles.kindOn : styles.kindOff}
                    >
                      Night
                    </Text>
                  </Pressable>
                </View>
                <TextInput
                  testID="edit-start"
                  value={start}
                  onChangeText={setStart}
                  style={styles.input}
                />
                <TextInput
                  testID="edit-end"
                  value={end}
                  onChangeText={setEnd}
                  style={styles.input}
                />
                {error ? (
                  <Text testID="edit-error" style={styles.error}>
                    {error}
                  </Text>
                ) : null}
                <Pressable testID="edit-save" onPress={() => void save()}>
                  <Text style={styles.action}>Save change</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  back: {
    color: theme.colors.night,
    fontSize: 16,
    marginBottom: 12,
  },
  nav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  navLabel: {
    color: theme.colors.night,
    fontSize: 16,
  },
  day: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  total: {
    color: theme.colors.ink,
    fontSize: 36,
    fontWeight: '700',
    marginTop: 12,
  },
  split: {
    color: theme.colors.ink,
    fontSize: 16,
    marginTop: 4,
  },
  row: {
    borderColor: theme.colors.line,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  kind: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  when: {
    color: theme.colors.muted,
    fontSize: 16,
    marginTop: 4,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  action: {
    color: theme.colors.night,
    fontSize: 16,
    fontWeight: '700',
  },
  delete: {
    color: theme.colors.under,
    fontSize: 16,
    fontWeight: '700',
  },
  kinds: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  kindOn: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  kindOff: {
    color: theme.colors.muted,
    fontSize: 16,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    color: theme.colors.ink,
    fontSize: 16,
    marginTop: 8,
    padding: 12,
  },
  error: {
    color: theme.colors.under,
    marginTop: 8,
  },
}));
