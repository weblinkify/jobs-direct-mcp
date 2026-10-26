import { PORTALS, type Job } from '../domain/seed';
import type { FitResult } from '../domain/ats';
import { ScoreBadge } from './ScoreBadge';

const portalLabel = (id: string) => PORTALS.find((p) => p.id === id)?.label ?? id;

export function JobList({ jobs, selectedId, fits, onSelect }: {
  jobs: Job[];
  selectedId: string | null;
  fits: Record<string, FitResult>;
  onSelect: (job: Job) => void;
}) {
  if (jobs.length === 0) {
    return <p className="card p-4 text-sm text-slate-500">No postings match. Try fewer keywords or a longer time window.</p>;
  }
  return (
    <ul className="space-y-2" aria-label="Search results">
      {jobs.map((job) => {
        const active = job.id === selectedId;
        return (
          <li key={job.id}>
            <button type="button" onClick={() => onSelect(job)} aria-current={active}
              className={`card w-full p-3 text-left transition hover:border-brand/50 ${active ? 'border-brand ring-2 ring-brand/20' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{job.title}</p>
                  <p className="truncate text-sm text-slate-600">{job.company} · {job.location}</p>
                </div>
                <ScoreBadge fit={fits[job.id]} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                <span className="chip bg-slate-100 text-slate-700">{portalLabel(job.portal)}</span>
                <span className="chip bg-slate-100 text-slate-700">{job.workplace}</span>
                {job.salary && <span className="chip bg-emerald-50 text-emerald-700">{job.salary}</span>}
                <span className="chip text-slate-500">{job.postedDaysAgo === 0 ? 'today' : `${job.postedDaysAgo}d ago`}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
