/** Browser port of jobsdirect/salary.py: indicative annual gross bands in thousands. */

type Band = [number, number];
type Market = 'US' | 'EU' | 'UK' | 'TR' | 'REMOTE';

export const BANDS: Record<string, Record<Market, [Band, Band, Band]>> = {
  'software engineer': {
    US: [[85, 115], [120, 165], [170, 240]], EU: [[40, 55], [55, 80], [80, 115]],
    UK: [[35, 50], [50, 75], [75, 110]], TR: [[600, 900], [900, 1500], [1500, 2400]],
    REMOTE: [[50, 75], [75, 120], [120, 180]],
  },
  'data scientist': {
    US: [[90, 120], [125, 165], [170, 230]], EU: [[42, 58], [58, 85], [85, 120]],
    UK: [[38, 52], [52, 78], [78, 115]], TR: [[650, 950], [950, 1600], [1600, 2500]],
    REMOTE: [[55, 80], [80, 125], [125, 185]],
  },
  'product manager': {
    US: [[90, 120], [125, 170], [175, 250]], EU: [[45, 60], [60, 90], [90, 130]],
    UK: [[40, 55], [55, 85], [85, 125]], TR: [[650, 950], [950, 1600], [1600, 2600]],
    REMOTE: [[55, 80], [80, 130], [130, 190]],
  },
  'project manager': {
    US: [[70, 95], [95, 130], [130, 175]], EU: [[40, 52], [52, 72], [72, 100]],
    UK: [[35, 48], [48, 68], [68, 95]], TR: [[500, 800], [800, 1300], [1300, 2000]],
    REMOTE: [[45, 65], [65, 100], [100, 145]],
  },
  'operations manager': {
    US: [[65, 85], [85, 120], [120, 165]], EU: [[38, 50], [50, 70], [70, 98]],
    UK: [[33, 45], [45, 65], [65, 90]], TR: [[480, 750], [750, 1200], [1200, 1900]],
    REMOTE: [[42, 60], [60, 95], [95, 140]],
  },
  designer: {
    US: [[65, 90], [90, 125], [125, 170]], EU: [[35, 48], [48, 68], [68, 95]],
    UK: [[30, 42], [42, 62], [62, 88]], TR: [[420, 700], [700, 1150], [1150, 1800]],
    REMOTE: [[40, 60], [60, 95], [95, 135]],
  },
};

export const CURRENCY: Record<Market, string> = { US: 'USD', EU: 'EUR', UK: 'GBP', TR: 'TRY', REMOTE: 'USD' };
export const MARKETS: { id: Market; label: string }[] = [
  { id: 'REMOTE', label: 'Remote / global' }, { id: 'US', label: 'United States' },
  { id: 'EU', label: 'European Union' }, { id: 'UK', label: 'United Kingdom' }, { id: 'TR', label: 'Türkiye' },
];

const ROLE_ALIASES: [string, string][] = [
  ['developer', 'software engineer'], ['engineer', 'software engineer'], ['frontend', 'software engineer'],
  ['backend', 'software engineer'], ['full stack', 'software engineer'], ['fullstack', 'software engineer'],
  ['data analyst', 'data scientist'], ['machine learning', 'data scientist'], ['ml engineer', 'data scientist'],
  ['product owner', 'product manager'], ['program manager', 'project manager'], ['scrum master', 'project manager'],
  ['operations', 'operations manager'], ['ux', 'designer'], ['ui', 'designer'],
];

export function matchRole(role: string): string | null {
  const lower = role.toLowerCase();
  return Object.keys(BANDS).find((k) => lower.includes(k)) ?? ROLE_ALIASES.find(([a]) => lower.includes(a))?.[1] ?? null;
}

export interface Benchmark {
  matchedRole: string;
  market: Market;
  currency: string;
  junior: Band;
  mid: Band;
  senior: Band;
}

export function benchmark(role: string, market: Market): Benchmark | null {
  const key = matchRole(role);
  if (!key) return null;
  const [junior, mid, senior] = BANDS[key][market];
  return { matchedRole: key, market, currency: CURRENCY[market], junior, mid, senior };
}

export type { Market };
