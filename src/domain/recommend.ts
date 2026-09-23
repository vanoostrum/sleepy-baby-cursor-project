import type { Fit, Recommendation } from './model';

export const RECOMMENDATION_SOURCE =
  'Ranges for 4 months and older are from the American Academy of Sleep Medicine consensus (Paruthi et al., 2016). The 0 to 3 month range is from the National Sleep Foundation.';

type Band = Recommendation & {
  minMonths: number;
  maxMonths: number;
};

const BANDS: readonly Band[] = [
  {
    minMonths: 0,
    maxMonths: 3,
    minHours: 14,
    maxHours: 17,
    label: '0 to 3 months',
  },
  {
    minMonths: 4,
    maxMonths: 11,
    minHours: 12,
    maxHours: 16,
    label: '4 to 11 months',
  },
  {
    minMonths: 12,
    maxMonths: 35,
    minHours: 11,
    maxHours: 14,
    label: '1 to 2 years',
  },
  {
    minMonths: 36,
    maxMonths: 71,
    minHours: 10,
    maxHours: 13,
    label: '3 to 5 years',
  },
  {
    minMonths: 72,
    maxMonths: 155,
    minHours: 9,
    maxHours: 12,
    label: '6 to 12 years',
  },
  {
    minMonths: 156,
    maxMonths: 1200,
    minHours: 8,
    maxHours: 10,
    label: '13 years and older',
  },
];

export function recommendationForAge(ageMonths: number): Recommendation {
  const months = Math.max(0, Math.floor(ageMonths));
  const band =
    BANDS.find(
      (item) => months >= item.minMonths && months <= item.maxMonths,
    ) ?? BANDS[BANDS.length - 1];
  return {
    minHours: band.minHours,
    maxHours: band.maxHours,
    label: band.label,
  };
}

export function fitFor(
  averageMinutes: number | null,
  recommendation: Recommendation,
): Fit {
  if (averageMinutes === null) {
    return 'unknown';
  }
  const hours = averageMinutes / 60;
  if (hours < recommendation.minHours) {
    return 'under';
  }
  if (hours > recommendation.maxHours) {
    return 'over';
  }
  return 'enough';
}
