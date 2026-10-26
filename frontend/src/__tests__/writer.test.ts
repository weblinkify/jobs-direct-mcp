import { describe, expect, it } from 'vitest';
import { coverLetter, cvBullets, rankBullets, tailorResume } from '../domain/writer';
import { benchmark, matchRole } from '../domain/salary';

const CV = `Jane Doe, 6 years of experience
- Organised team offsites
- Cut AWS spend 25% by moving batch jobs to Kubernetes
- Built React dashboards for 3 business units`;
const JOB = 'We need React, AWS and Kubernetes experience. Terraform is a plus.';

describe('writer (same expectations as tests/test_writer.py)', () => {
  it('ranks bullets', () => {
    const ranked = rankBullets(cvBullets(CV), ['react', 'aws', 'kubernetes']);
    expect(ranked[0].text.startsWith('Cut AWS spend')).toBe(true);
    expect(ranked.at(-1)!.text).toBe('Organised team offsites');
  });

  it('tailors from the candidate text', () => {
    const out = tailorResume(CV, JOB, 'Platform Engineer', 'Acme');
    expect(out).toContain('Platform Engineer at Acme');
    expect(out).toContain('**Missing**: terraform');
    expect(out).toContain('6+ years');
  });

  it('writes a dated letter with proof', () => {
    const letter = coverLetter(CV, JOB, 'Acme', 'Platform Engineer', 'Jane Doe', undefined, new Date(2026, 9, 5));
    expect(letter.startsWith('05 October 2026')).toBe(true);
    expect(letter).toContain('Cut AWS spend 25%');
    expect(letter.trimEnd().endsWith('Jane Doe')).toBe(true);
  });

  it('falls back to sentences with numbers', () => {
    expect(cvBullets('I grew revenue by 40% in two years at Acme. I like tea.')).toEqual([
      'I grew revenue by 40% in two years at Acme.',
    ]);
  });
});

describe('salary', () => {
  it('maps roles and markets', () => {
    expect(matchRole('Scrum Master')).toBe('project manager');
    expect(matchRole('Chef')).toBeNull();
    expect(benchmark('Data Scientist', 'UK')).toMatchObject({ currency: 'GBP', mid: [52, 78] });
  });
});
