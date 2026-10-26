import { describe, expect, it } from 'vitest';
import { degreeLevel, hasTerm, listingStatus, parseDeadline, requiredYears, roundHalfUp } from '../domain/ats';

describe('ats helpers', () => {
  it('matches punctuated terms on word edges', () => {
    expect(hasTerm('ci/cd', 'own ci/cd')).toBe(true);
    expect(hasTerm('java', 'javascript')).toBe(false);
    expect(hasTerm('p&l', 'full p&l ownership')).toBe(true);
  });

  it('parses deadline formats and rejects impossible dates', () => {
    expect(parseDeadline('2026-12-01')).toBe('2026-12-01');
    expect(parseDeadline('1.9.2026')).toBe('2026-09-01');
    expect(parseDeadline('15 Dec 2026')).toBe('2026-12-15');
    expect(parseDeadline('December 15, 2026.')).toBe('2026-12-15');
    expect(parseDeadline('31.02.2026')).toBeNull();
    expect(parseDeadline('01.09/2026')).toBeNull();
    expect(parseDeadline('Dece 15 2026')).toBeNull();
  });

  it('handles Turkish dotted capital I in closure notices', () => {
    expect(listingStatus('İlan yayından kaldırılmıştır', '2026-10-26').is_active).toBe(false);
  });

  it('rounds half up', () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(26.65, 1)).toBe(26.7);
  });

  it('reads ranges and degrees', () => {
    expect(requiredYears('3-5 years')).toBe(3);
    expect(degreeLevel('Scrum Master')).toBe(0);
  });
});
