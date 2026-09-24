import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { Fit } from '../domain/model';
import type { Histogram } from '../storage/db';
import { useSleep } from '../state/sleep';
import { formatDuration } from '../time/format';
import { Screen, Title } from '../ui/screen';

const FIT_COLOR: Record<Fit, string> = {
  under: '#C45B5B',
  enough: '#3E8B6E',
  over: '#C48A2A',
  unknown: '#E4D9C8',
};

export default function TrendsScreen() {
  const { log } = useSleep();
  const [grain, setGrain] = useState<'week' | 'month'>('week');
  const [histogram, setHistogram] = useState<Histogram | null>(null);

  useEffect(() => {
    if (!log) {
      return;
    }
    let alive = true;
    (async () => {
      const kid = await log.activeKid();
      if (!kid) {
        if (alive) setHistogram(null);
        return;
      }
      const result = await log.histogram(
        kid.id,
        grain,
        grain === 'week' ? 8 : 6,
      );
      if (alive) setHistogram(result.ok ? result.value : null);
    })();
    return () => {
      alive = false;
    };
  }, [log, grain]);

  const recommendation = histogram?.recommendation;
  const maxHours = Math.max(
    recommendation?.maxHours ?? 1,
    ...(histogram?.bars ?? []).map((bar) => (bar.averageMinutes ?? 0) / 60),
  );
  const chartHeight = 160;

  return (
    <Screen testID="trends-screen">
      <ScrollView>
        <Pressable testID="back-home" onPress={() => router.back()}>
          <Text style={styles.back}>Home</Text>
        </Pressable>
        <Title>Averages</Title>
        <View style={styles.grains}>
          <Pressable testID="grain-week" onPress={() => setGrain('week')}>
            <Text style={grain === 'week' ? styles.grainOn : styles.grainOff}>
              Weeks
            </Text>
          </Pressable>
          <Pressable testID="grain-month" onPress={() => setGrain('month')}>
            <Text style={grain === 'month' ? styles.grainOn : styles.grainOff}>
              Months
            </Text>
          </Pressable>
        </View>
        {recommendation ? (
          <Text style={styles.range} testID="recommended-range">
            {recommendation.label}: {recommendation.minHours} to{' '}
            {recommendation.maxHours} hours
          </Text>
        ) : null}
        <View
          style={[styles.chart, { height: chartHeight }]}
          testID="histogram"
        >
          {(histogram?.bars ?? []).map((bar) => {
            const hours = (bar.averageMinutes ?? 0) / 60;
            const height =
              bar.averageMinutes === null
                ? 0
                : Math.max(4, (hours / maxHours) * chartHeight);
            return (
              <View
                key={bar.start}
                style={styles.column}
                testID={`bar-${bar.start}`}
              >
                <View style={styles.barSlot}>
                  <View
                    style={[
                      styles.bar,
                      { height, backgroundColor: FIT_COLOR[bar.fit] },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{bar.label}</Text>
                <Text style={styles.barValue}>
                  {bar.averageMinutes === null
                    ? 'none'
                    : formatDuration(bar.averageMinutes)}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.legend}>
          Red is under the range. Green is inside it. Amber is over it.
        </Text>
        <Text testID="recommendation-source" style={styles.source}>
          {histogram?.source ?? ''}
        </Text>
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
  grains: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  grainOn: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  grainOff: {
    color: theme.colors.muted,
    fontSize: 18,
  },
  range: {
    color: theme.colors.ink,
    fontSize: 16,
    marginTop: 12,
  },
  chart: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 20,
  },
  column: {
    flex: 1,
  },
  barSlot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 8,
    width: '100%',
  },
  barLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    marginTop: 6,
  },
  barValue: {
    color: theme.colors.ink,
    fontSize: 10,
  },
  legend: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: 16,
  },
  source: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 12,
  },
}));
