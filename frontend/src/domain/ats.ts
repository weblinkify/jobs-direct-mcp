/**
 * Browser port of jobsdirect/ats.py. Keep the two in sync: src/__tests__/parity.test.ts checks this
 * file against fixtures/ats_cases.json, which is generated from the Python engine.
 */

export const INDUSTRY_TAXONOMY: Record<string, string[]> = {
  'Fintech & Financial Services': [
    'fintech', 'banking', 'payments', 'card payments', 'merchant', 'checkout', 'forex',
    'brokerage', 'trading', 'crypto', 'blockchain', 'web3', 'lending', 'credit',
    'securities', 'wealthtech', 'insurance', 'insurtech',
  ],
  'Industrial & Manufacturing': [
    'manufacturing', 'industrial', 'heavy machinery', 'machinery', 'automotive', 'aerospace',
    'factory', 'plant', 'supply chain', 'logistics', 'freight', 'warehouse', 'procurement',
    'mechanical', 'sensors', 'automation hardware',
  ],
  'Healthcare & Life Sciences': [
    'healthcare', 'hospital', 'clinical', 'pharma', 'pharmaceutical', 'biotech',
    'medical device', 'life sciences', 'diagnostics', 'genomics', 'healthtech', 'patient',
  ],
  'E-Commerce & Retail': [
    'ecommerce', 'e-commerce', 'retail', 'shopify', 'd2c', 'marketplace', 'consumer goods',
    'fmcg', 'omnichannel', 'merchandising',
  ],
  'Software & SaaS': [
    'saas', 'enterprise software', 'cloud', 'devops', 'cybersecurity', 'infrastructure',
    'data engineering', 'developer tools', 'b2b software', 'platform', 'microservices',
    'api', 'apis',
  ],
  'Media & Gaming': [
    'gaming', 'game dev', 'unity', 'unreal', 'streaming', 'media', 'entertainment',
    'broadcasting', 'animation',
  ],
  'Energy & Cleantech': [
    'energy', 'oil & gas', 'renewables', 'solar', 'wind', 'power grid', 'utilities',
    'cleantech', 'sustainability', 'battery', 'ev charging',
  ],
  'Education & EdTech': ['education', 'edtech', 'e-learning', 'university', 'curriculum', 'academic'],
  'Telecom & Networking': ['telecom', 'telecommunications', 'networking', '5g', 'wireless', 'broadband', 'isp'],
};

export const SKILL_LEXICON = [
  'agile', 'scrum', 'kanban', 'jira', 'confluence', 'project management', 'pmp',
  'stakeholder management', 'roadmap', 'kpi', 'okr', 'budget', 'p&l', 'cross-functional',
  'vendor management', 'python', 'javascript', 'typescript', 'react', 'node.js', 'java',
  'golang', 'sql', 'postgresql', 'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform',
  'git', 'ci/cd', 'rest api', 'graphql', 'machine learning', 'data analytics', 'power bi',
  'tableau', 'crm', 'erp', 'salesforce', 'hubspot', 'b2b sales', 'figma',
];

export const LANGUAGES = [
  'english', 'turkish', 'german', 'french', 'spanish', 'italian', 'dutch', 'swedish',
  'finnish', 'danish', 'norwegian', 'polish', 'portuguese', 'russian', 'arabic',
  'mandarin', 'chinese', 'japanese', 'korean', 'hindi', 'urdu',
];

export const CLEARANCE_PHRASES = [
  'security clearance', 'top secret', 'must be a citizen', 'citizenship required',
  'must hold citizenship', 'no visa sponsorship', 'eligible to work in the us without sponsorship',
];

export const WEIGHTS = { domain: 40, qualifications: 20, skills: 30, logistics: 10 } as const;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
const termRe = (term: string, flags = '') => new RegExp(`(?<![a-z0-9])${escape(term)}(?![a-z0-9])`, flags);

export function roundHalfUp(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.floor(value * factor + 0.5) / factor;
}

export function hasTerm(term: string, textLower: string): boolean {
  return termRe(term).test(textLower);
}

export function countTerm(term: string, textLower: string): number {
  return textLower.match(termRe(term, 'g'))?.length ?? 0;
}

export function extractDomains(text: string): Record<string, number> {
  const lower = text.toLowerCase();
  const counts: Record<string, number> = {};
  for (const [domain, keywords] of Object.entries(INDUSTRY_TAXONOMY)) {
    const hits = keywords.reduce((n, kw) => n + countTerm(kw, lower), 0);
    if (hits) counts[domain] = hits;
  }
  return counts;
}

export function domainAffinity(cand: Record<string, number>, job: Record<string, number>): number {
  const entries = Object.entries(job);
  if (entries.length === 0) return 0.85;
  const total = entries.reduce((n, [, c]) => n + c, 0);
  let score = 0;
  for (const [domain, count] of entries) {
    if (domain in cand) score += (count / total) * Math.min(cand[domain] / 3, 1);
  }
  return Math.max(0, Math.min(score, 1));
}

const RANGE_RE = /(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?)/gi;
const SINGLE_RE = /(\d{1,2})\s*\+?\s*(?:years?|yrs?)/gi;

function yearsIn(text: string, rangeGroup: 1 | 2): number | null {
  const found: number[] = [];
  const spans: [number, number][] = [];
  for (const m of text.matchAll(RANGE_RE)) {
    found.push(Number(m[rangeGroup]));
    spans.push([m.index!, m.index! + m[0].length]);
  }
  for (const m of text.matchAll(SINGLE_RE)) {
    if (spans.some(([s, e]) => s <= m.index! && m.index! < e)) continue;
    found.push(Number(m[1]));
  }
  return found.length ? Math.max(...found) : null;
}

/** Minimum years a posting asks for; for "3-5 years" the floor counts. */
export const requiredYears = (text: string) => yearsIn(text, 1);
/** Years a candidate states; ranges count by their upper bound. */
export const candidateYears = (text: string) => yearsIn(text, 2);

export function degreeLevel(text: string): number {
  const t = text.toLowerCase();
  if (/\b(ph\.?d|doctorate|doctoral)\b/.test(t)) return 3;
  if (/\b(master'?s?\s+(?:degree|of|in)|msc|m\.sc|mba|meng)\b/.test(t)) return 2;
  if (/\b(bachelor'?s?|bsc|b\.sc|beng|undergraduate degree)\b/.test(t)) return 1;
  return 0;
}

export function requiredLanguages(text: string): string[] {
  const lower = text.toLowerCase();
  return LANGUAGES.filter((lang) =>
    [
      new RegExp(`\\b(?:fluent|fluency|native|proficient|business[- ]level)\\s+(?:in\\s+)?${lang}\\b`),
      new RegExp(`\\b${lang}\\s+(?:is\\s+)?(?:required|mandatory|essential)\\b`),
      new RegExp(`\\b${lang}\\s+\\(?(?:fluent|native|c1|c2)\\)?`),
    ].some((re) => re.test(lower)),
  );
}

// ---------------------------------------------------------------------------
// Listing expiry
// ---------------------------------------------------------------------------

const CLOSED_PATTERNS: [RegExp, string][] = [
  [
    /no longer accepting applications|this job has expired|job is closed|position (?:has been )?filled|position closed|posting (?:has )?expired|listing has ended|this job is no longer available/,
    'The posting says it is closed.',
  ],
  [
    /ilan yay[ıi]ndan kald[ıi]r[ıi]lm[ıi][sş]|ba[sş]vuruya kapal[ıi]|ilan(?:[ıi]n)? s[üu]resi dolmu[sş]/,
    'The Turkish listing says it is closed (ilan kapanmış).',
  ],
];

const DEADLINE_RE =
  /(?:application deadline|apply by|apply before|closing date|valid until|expires on|son ba[sş]vuru tarihi)\s*[:-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}[./]\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})/i;

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september',
  'october', 'november', 'december'];

function monthIndex(name: string): number | null {
  const n = name.toLowerCase();
  const full = MONTHS.indexOf(n);
  if (full >= 0) return full + 1;
  const short = MONTHS.findIndex((m) => m.slice(0, 3) === n);
  return short >= 0 && n.length === 3 ? short + 1 : null;
}

function isoDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1) return null;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > days) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Mirrors the strptime formats tried in Python's parse_deadline. Returns ISO yyyy-mm-dd or null. */
export function parseDeadline(raw: string): string | null {
  const s = raw.trim().replace(/[.,]+$/, '');
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return isoDate(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})([./])(\d{1,2})\2(\d{4})$/))) return isoDate(+m[4], +m[3], +m[1]);
  if ((m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/))) {
    const month = monthIndex(m[2]);
    return month ? isoDate(+m[3], month, +m[1]) : null;
  }
  if ((m = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/))) {
    const month = monthIndex(m[1]);
    return month ? isoDate(+m[3], month, +m[2]) : null;
  }
  return null;
}

export interface ListingStatus {
  status: 'ACTIVE' | 'EXPIRED';
  is_active: boolean;
  reason: string;
  deadline: string | null;
}

export function todayIso(): string {
  const d = new Date();
  return isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate())!;
}

export function listingStatus(text: string, today: string = todayIso()): ListingStatus {
  const lower = text.replace(/İ/g, 'i').toLowerCase();
  for (const [pattern, reason] of CLOSED_PATTERNS) {
    if (pattern.test(lower)) return { status: 'EXPIRED', is_active: false, reason, deadline: null };
  }
  const m = text.match(DEADLINE_RE);
  if (m) {
    const deadline = parseDeadline(m[1]);
    if (deadline) {
      return deadline < today
        ? { status: 'EXPIRED', is_active: false, reason: `The application deadline (${deadline}) has passed.`, deadline }
        : { status: 'ACTIVE', is_active: true, reason: `Open until ${deadline}.`, deadline };
    }
  }
  return { status: 'ACTIVE', is_active: true, reason: 'No closure notice or past deadline found.', deadline: null };
}

// ---------------------------------------------------------------------------
// 4-tier fit evaluation
// ---------------------------------------------------------------------------

export type Verdict =
  | 'CLOSED' | 'LANGUAGE_GATE_FAILED' | 'VERIFY_ELIGIBILITY' | 'NOT_ELIGIBLE' | 'POOR_DOMAIN_FIT'
  | 'STRONG_MATCH' | 'MODERATE_MATCH' | 'WEAK_MATCH';

export interface FitResult {
  total_fit_score: number;
  verdict: Verdict;
  listing: ListingStatus;
  tiers: {
    domain: { score: number; max: number; affinity: number; candidate_domains: string[]; job_domains: string[] };
    qualifications: {
      score: number; max: number; required_years: number | null; candidate_years: number | null;
      required_degree: number; candidate_degree: number; degree_ok: boolean;
    };
    skills: { score: number; max: number; matched: string[]; missing: string[] };
    logistics: {
      score: number; max: number; required_languages: string[]; missing_languages: string[];
      clearance_phrase: string | null;
    };
  };
}

const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function evaluateFit(
  candidateProfile: string,
  jobDescription: string,
  candidateLanguages: string[] | null = null,
  workAuthorized: boolean | null = null,
  today: string = todayIso(),
): FitResult {
  const candLower = candidateProfile.toLowerCase();
  const jdLower = jobDescription.toLowerCase();

  const candDomains = extractDomains(candidateProfile);
  const jobDomains = extractDomains(jobDescription);
  const affinity = domainAffinity(candDomains, jobDomains);
  const domainScore = roundHalfUp(affinity * WEIGHTS.domain, 1);

  const reqYears = requiredYears(jobDescription);
  const candYrs = candidateYears(candidateProfile);
  const reqDegree = degreeLevel(jobDescription);
  const candDegree = degreeLevel(candidateProfile);
  const degreeOk = candDegree >= reqDegree;
  const degreePoints = degreeOk ? 10 : 4;
  let yearsPoints: number;
  if (reqYears === null) yearsPoints = 10;
  else if (candYrs === null) yearsPoints = 6;
  else yearsPoints = reqYears > 0 ? roundHalfUp(Math.min(candYrs / reqYears, 1) * 10, 1) : 10;
  const qualificationScore = roundHalfUp(degreePoints + yearsPoints, 1);

  const jobSkills = SKILL_LEXICON.filter((s) => hasTerm(s, jdLower));
  const matched = jobSkills.filter((s) => hasTerm(s, candLower));
  const missing = jobSkills.filter((s) => !matched.includes(s));
  const skillRatio = jobSkills.length ? matched.length / jobSkills.length : 0.8;
  const skillsScore = roundHalfUp(skillRatio * WEIGHTS.skills, 1);

  const langsNeeded = requiredLanguages(jobDescription);
  const candLangs = new Set(
    candidateLanguages === null
      ? LANGUAGES.filter((l) => hasTerm(l, candLower))
      : candidateLanguages.map((l) => l.trim().toLowerCase()),
  );
  const missingLangs = langsNeeded.filter((l) => !candLangs.has(l));
  const clearance = CLEARANCE_PHRASES.find((p) => jdLower.includes(p)) ?? null;

  let logisticsScore = 10;
  if (clearance && workAuthorized !== true) logisticsScore -= 4;
  if (missingLangs.length) logisticsScore = 0;

  let total = Math.trunc(roundHalfUp(domainScore + qualificationScore + skillsScore + logisticsScore));
  total = Math.max(0, Math.min(total, 100));

  const listing = listingStatus(jobDescription, today);
  let verdict: Verdict;
  if (!listing.is_active) {
    total = Math.min(total, 20);
    verdict = 'CLOSED';
  } else if (missingLangs.length) verdict = 'LANGUAGE_GATE_FAILED';
  else if (clearance && workAuthorized === null) verdict = 'VERIFY_ELIGIBILITY';
  else if (clearance && workAuthorized === false) verdict = 'NOT_ELIGIBLE';
  else if (Object.keys(jobDomains).length && affinity < 0.2) verdict = 'POOR_DOMAIN_FIT';
  else if (total >= 80) verdict = 'STRONG_MATCH';
  else if (total >= 60) verdict = 'MODERATE_MATCH';
  else verdict = 'WEAK_MATCH';

  return {
    total_fit_score: total,
    verdict,
    listing,
    tiers: {
      domain: {
        score: domainScore, max: WEIGHTS.domain, affinity: roundHalfUp(affinity, 3),
        candidate_domains: Object.keys(candDomains).sort(byCodePoint),
        job_domains: Object.keys(jobDomains).sort(byCodePoint),
      },
      qualifications: {
        score: qualificationScore, max: WEIGHTS.qualifications, required_years: reqYears,
        candidate_years: candYrs, required_degree: reqDegree, candidate_degree: candDegree, degree_ok: degreeOk,
      },
      skills: { score: skillsScore, max: WEIGHTS.skills, matched, missing },
      logistics: {
        score: logisticsScore, max: WEIGHTS.logistics, required_languages: langsNeeded,
        missing_languages: missingLangs, clearance_phrase: clearance,
      },
    },
  };
}
