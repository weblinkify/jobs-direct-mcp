import type { FitResult, Verdict } from '../domain/ats';

export const VERDICT_LABEL: Record<Verdict, string> = {
  STRONG_MATCH: 'Strong match',
  MODERATE_MATCH: 'Moderate match',
  WEAK_MATCH: 'Weak match',
  POOR_DOMAIN_FIT: 'Different industry',
  LANGUAGE_GATE_FAILED: 'Language gate failed',
  VERIFY_ELIGIBILITY: 'Check eligibility',
  NOT_ELIGIBLE: 'Not eligible',
  CLOSED: 'Closed',
};

export function verdictTone(v: Verdict): string {
  if (v === 'STRONG_MATCH') return 'bg-emerald-100 text-emerald-800';
  if (v === 'MODERATE_MATCH') return 'bg-sky-100 text-sky-800';
  if (v === 'VERIFY_ELIGIBILITY') return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-800';
}

export function ScoreBadge({ fit }: { fit?: FitResult }) {
  if (!fit) return null;
  return (
    <span className={`chip shrink-0 tabular-nums ${verdictTone(fit.verdict)}`} title={VERDICT_LABEL[fit.verdict]}>
      {fit.total_fit_score}
    </span>
  );
}
