import { describe, expect, it } from 'vitest';
import { evaluateFit } from '../domain/ats';
import { SAMPLE_PROFILE, seedJobs } from '../domain/seed';
import { MockJobsService } from '../services/JobsService';
import { loadApplications, saveApplications, toCsv, upsertApplication, type Application } from '../services/tracker';

describe('MockJobsService', () => {
  const svc = new MockJobsService(seedJobs(), 0);

  it('filters by portal, workplace and age', async () => {
    const all = await svc.search({ query: '', portal: 'all', workplace: 'any', maxAgeDays: 30 });
    expect(all).toHaveLength(seedJobs().length);
    const kariyer = await svc.search({ query: '', portal: 'kariyer', workplace: 'any', maxAgeDays: 30 });
    expect(kariyer.every((j) => j.portal === 'kariyer')).toBe(true);
    const fresh = await svc.search({ query: '', portal: 'all', workplace: 'remote', maxAgeDays: 1 });
    expect(fresh.every((j) => j.workplace === 'remote' && j.postedDaysAgo <= 1)).toBe(true);
  });

  it('ranks title matches first', async () => {
    const res = await svc.search({ query: 'frontend react', portal: 'all', workplace: 'any', maxAgeDays: 30 });
    expect(res[0].title).toContain('Frontend');
  });
});

describe('seed data exercises every verdict path the demo promises', () => {
  const verdicts = Object.fromEntries(seedJobs().map((j) => [j.id, evaluateFit(SAMPLE_PROFILE, j.description).verdict]));
  it('scores the showcase postings as intended', () => {
    expect(verdicts['li-4012345678']).toBe('STRONG_MATCH');
    expect(verdicts['rc-sup-07']).toBe('CLOSED');
    expect(verdicts['kn-yazilim-77']).toBe('CLOSED');
    expect(verdicts['ch-pm-88']).toBe('LANGUAGE_GATE_FAILED');
    expect(verdicts['li-4009998888']).toBe('VERIFY_ELIGIBILITY');
  });
});

describe('tracker', () => {
  const app: Application = { jobId: '1', company: 'A, Inc', role: 'Dev', portal: 'linkedin', status: 'saved', date: '2026-10-01', notes: 'say "hi"' };

  it('upserts without losing the original date', () => {
    const once = upsertApplication([], app);
    const twice = upsertApplication(once, { ...app, status: 'applied', date: '2026-10-09' });
    expect(twice).toHaveLength(1);
    expect(twice[0]).toMatchObject({ status: 'applied', date: '2026-10-01' });
  });

  it('escapes CSV cells', () => {
    expect(toCsv([app]).split('\n')[1]).toBe('2026-10-01,1,"A, Inc",Dev,linkedin,saved,"say ""hi"""');
  });

  it('survives corrupt or missing storage', () => {
    expect(loadApplications({ getItem: () => '{bad json' })).toEqual([]);
    expect(loadApplications({ getItem: () => JSON.stringify([app, { nope: 1 }]) })).toEqual([app]);
    expect(loadApplications(undefined)).toEqual([]);
    expect(() => saveApplications([app], { setItem: () => { throw new Error('quota'); } })).not.toThrow();
  });
});
