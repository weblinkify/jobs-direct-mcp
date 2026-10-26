import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { FitResult } from '../domain/ats';
import { VERDICT_LABEL, verdictTone } from './ScoreBadge';

const DEGREES = ['none stated', "bachelor's", "master's", 'PhD'];

function Bar({ label, score, max, children }: { label: string; score: number; max: number; children: ReactNode }) {
  const pct = max ? Math.round((score / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-slate-500">{score} / {max}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 text-xs text-slate-600">{children}</div>
    </div>
  );
}

const list = (items: string[], empty = 'none') => (items.length ? items.join(', ') : empty);

export function FitPanel({ fit }: { fit: FitResult }) {
  const { domain, qualifications: q, skills, logistics } = fit.tiers;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-4 border-brand/20">
          <span className="text-2xl font-bold tabular-nums">{fit.total_fit_score}</span>
          <span className="text-[10px] uppercase tracking-wide text-slate-500">of 100</span>
        </div>
        <div>
          <span className={`chip ${verdictTone(fit.verdict)}`}>{VERDICT_LABEL[fit.verdict]}</span>
          <p className={`mt-2 flex items-center gap-1.5 text-sm ${fit.listing.is_active ? 'text-slate-600' : 'text-rose-700'}`}>
            {fit.listing.is_active ? <CheckCircle2 size={15} className="text-emerald-600" /> : <XCircle size={15} />}
            {fit.listing.reason}
          </p>
        </div>
      </div>

      <Bar label="1 · Industry affinity" score={domain.score} max={domain.max}>
        Job industry: {list(domain.job_domains, 'horizontal (any industry)')}. Your background: {list(domain.candidate_domains, 'not detected')}.
      </Bar>
      <Bar label="2 · Qualifications gate" score={q.score} max={q.max}>
        Years: needs {q.required_years ?? 'not stated'}, you have {q.candidate_years ?? 'not stated'}. Degree: needs {DEGREES[q.required_degree]}, you have {DEGREES[q.candidate_degree]}.
      </Bar>
      <Bar label="3 · Skills overlap" score={skills.score} max={skills.max}>
        <span className="text-emerald-700">Matched: {list(skills.matched)}</span>
        {skills.missing.length > 0 && <span className="text-rose-700"> · Missing: {list(skills.missing)}</span>}
      </Bar>
      <Bar label="4 · Language & eligibility" score={logistics.score} max={logistics.max}>
        Required languages: {list(logistics.required_languages)}
        {logistics.missing_languages.length > 0 && <span className="text-rose-700"> · you lack {list(logistics.missing_languages)}</span>}
        {logistics.clearance_phrase && (
          <span className="mt-1 flex items-center gap-1 text-amber-700">
            <AlertTriangle size={13} /> Posting says “{logistics.clearance_phrase}”.
          </span>
        )}
      </Bar>
    </div>
  );
}
