import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { DaySummary, Kid, SleepKind, SleepSession } from '../domain/model';
import { ageInMonths, ageLabel, dayKeyFromDate } from '../domain/summary';
import { useSleep } from '../state/sleep';
import { formatDuration } from '../time/format';
import { errorCopy } from '../ui/errors';
import { ICON_GLYPH } from '../ui/icons';
import { Card, Muted, PrimaryButton, Screen, Title } from '../ui/screen';

export default function HomeScreen() {
  const { log, revision, refresh } = useSleep();
  const [ready, setReady] = useState(false);
  const [kids, setKids] = useState<Kid[]>([]);
  const [active, setActive] = useState<Kid | null>(null);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [open, setOpen] = useState<SleepSession | null>(null);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      Keyboard.dismiss();
    }, []),
  );

  useEffect(() => {
    if (!log) {
      return;
    }
    let alive = true;
    (async () => {
      const nextKids = await log.listKids();
      const nextActive = await log.activeKid();
      const nextDay = nextActive
        ? await log.day(nextActive.id, dayKeyFromDate(new Date()))
        : null;
      const nextOpen = nextActive ? await log.openSession(nextActive.id) : null;
      if (!alive) {
        return;
      }
      setKids(nextKids);
      setActive(nextActive);
      setSummary(nextDay && nextDay.ok ? nextDay.value : null);
      setOpen(nextOpen);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [log, revision]);

  async function start(kidId: Kid['id'], kind: SleepKind) {
    if (!log) {
      return;
    }
    const result = await log.startSleep(kidId, kind);
    if (!result.ok) {
      setError(errorCopy(result.error));
      return;
    }
    setError('');
    refresh();
  }

  if (!log || !ready || !active) {
    return (
      <Screen testID="home-screen">
        <View style={styles.empty}>
          <Title>SleepyBaby</Title>
          <Muted>Add a child to start tracking sleep on this phone.</Muted>
          <PrimaryButton
            label="Add a child"
            testID="add-kid"
            onPress={() => router.push('/kid/new')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen testID="home-screen">
      <Text
        numberOfLines={1}
        onLayout={(event) => {
          const { width, height, x, y } = event.nativeEvent.layout;
          const large = width > 360 || height > 96;
          console.info(
            large
              ? `active-kid-name is on a large parent ${Math.round(width)}x${Math.round(height)} at ${Math.round(x)},${Math.round(y)}`
              : `active-kid-name text node ${Math.round(width)}x${Math.round(height)} at ${Math.round(x)},${Math.round(y)}`,
          );
        }}
        style={styles.name}
        testID="active-kid-name"
      >
        {active.name}
      </Text>
      <View style={styles.header}>
        <Text style={styles.glyph}>{ICON_GLYPH[active.icon]}</Text>
        <View style={styles.headerText}>
          <Text style={styles.age}>
            {ageLabel(ageInMonths(active.birthday, new Date()))}
          </Text>
        </View>
      </View>
      {kids.length > 1 ? (
        <View style={styles.switcher}>
          {kids.map((kid) => (
            <Pressable
              key={kid.id}
              testID={`switch-${kid.id}`}
              onPress={() => {
                void log.setActiveKid(kid.id).then(() => refresh());
              }}
              style={[styles.switch, kid.id === active.id && styles.switchOn]}
            >
              <Text>{ICON_GLYPH[kid.icon]}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Card>
        <Text style={styles.total} testID="today-total">
          {formatDuration(summary?.totalMinutes ?? 0)}
        </Text>
        <Text style={styles.totalLabel}>today</Text>
        <View style={styles.split}>
          <Text style={styles.splitItem}>
            Night {formatDuration(summary?.nightMinutes ?? 0)}
          </Text>
          <Text style={styles.splitItem}>
            Nap {formatDuration(summary?.napMinutes ?? 0)}
          </Text>
        </View>
      </Card>
      {open ? (
        <PrimaryButton
          label="Stop sleep"
          testID="stop-sleep"
          onPress={() => {
            void log.stopSleep(active.id).then((result) => {
              if (!result.ok) {
                setError(errorCopy(result.error));
                return;
              }
              setError('');
              refresh();
            });
          }}
        />
      ) : (
        <View style={styles.actions}>
          <Pressable
            testID="start-nap"
            onPress={() => {
              void start(active.id, 'nap');
            }}
            style={styles.nap}
          >
            <Text style={styles.actionLabel}>Start nap</Text>
          </Pressable>
          <Pressable
            testID="start-night"
            onPress={() => {
              void start(active.id, 'night');
            }}
            style={styles.night}
          >
            <Text style={styles.actionLabel}>Start night</Text>
          </Pressable>
        </View>
      )}
      {error ? (
        <Text testID="sleep-error" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <View style={styles.links}>
        <Pressable testID="open-day" onPress={() => router.push('/day')}>
          <Text style={styles.link}>Sleeps today</Text>
        </Pressable>
        <Pressable testID="open-trends" onPress={() => router.push('/trends')}>
          <Text style={styles.link}>Averages</Text>
        </Pressable>
        <Pressable testID="add-kid" onPress={() => router.push('/kid/new')}>
          <Text style={styles.link}>Add a child</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  empty: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  glyph: {
    fontSize: 48,
  },
  headerText: {
    flex: 1,
  },
  name: {
    alignSelf: 'flex-start',
    color: theme.colors.ink,
    fontSize: 28,
    fontWeight: '700',
    height: 48,
    lineHeight: 48,
    width: 200,
  },
  age: {
    color: theme.colors.muted,
    fontSize: 16,
    marginTop: 4,
  },
  switcher: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  switch: {
    borderColor: theme.colors.line,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    padding: 8,
  },
  switchOn: {
    borderColor: theme.colors.night,
  },
  total: {
    color: theme.colors.ink,
    fontSize: 48,
    fontWeight: '700',
  },
  totalLabel: {
    color: theme.colors.muted,
    fontSize: 16,
  },
  split: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  splitItem: {
    color: theme.colors.ink,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  nap: {
    alignItems: 'center',
    backgroundColor: theme.colors.nap,
    borderRadius: theme.radius.button,
    flex: 1,
    paddingVertical: 16,
  },
  night: {
    alignItems: 'center',
    backgroundColor: theme.colors.night,
    borderRadius: theme.radius.button,
    flex: 1,
    paddingVertical: 16,
  },
  actionLabel: {
    color: '#FFFBF5',
    fontSize: 18,
    fontWeight: '700',
  },
  links: {
    gap: 12,
    marginTop: 28,
  },
  link: {
    color: theme.colors.night,
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: theme.colors.under,
    fontSize: 16,
    marginTop: 12,
  },
}));
