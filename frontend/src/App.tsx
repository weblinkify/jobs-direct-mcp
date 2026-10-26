import { BookmarkPlus, ExternalLink, UserRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluateFit, type FitResult } from './domain/ats';
import { SAMPLE_PROFILE, type Job } from './domain/seed';
import { coverLetter, tailorResume } from './domain/writer';
import { MockJobsService, type SearchQuery } from './services/JobsService';
import { loadApplications, saveApplications, upsertApplication, type Application, type Status } from './services/tracker';
import { DocPanel } from './components/DocPanel';
import { FitPanel } from './components/FitPanel';
import { Header } from './components/Header';
import { JobList } from './components/JobList';
import { SalaryCard } from './components/SalaryCard';
import { SearchPanel } from './components/SearchPanel';
import { TrackerPanel } from './components/TrackerPanel';

const INITIAL_QUERY: SearchQuery = { query: 'engineer', portal: 'all', workplace: 'any', maxAgeDays: 30 };
type Tab = 'fit' | 'resume' | 'letter' | 'posting';
const TABS: { id: Tab; label: string }[] = [
  { id: 'fit', label: 'ATS fit score' },
  { id: 'resume', label: 'Tailored resume' },
  { id: 'letter', label: 'Cover letter' },
  { id: 'posting', label: 'Posting' },
];

const slug = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');

export default function App() {
  const service = useMemo(() => new MockJobsService(), []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Job | null>(null);
  const [tab, setTab] = useState<Tab>('fit');
  const [profile, setProfile] = useState(SAMPLE_PROFILE);
  const [name, setName] = useState('Alex Morgan');
  const [apps, setApps] = useState<Application[]>(() => loadApplications());
  const searchId = useRef(0);

  const runSearch = async (q: SearchQuery) => {
    const id = ++searchId.current;
    setBusy(true);
    try {
      const found = await service.search(q);
      if (id !== searchId.current) return; // a newer search started; drop stale results
      setJobs(found);
      setSelected((cur) => found.find((j) => j.id === cur?.id) ?? found[0] ?? null);
    } finally {
      if (id === searchId.current) setBusy(false);
    }
  };

  useEffect(() => {
    void runSearch(INITIAL_QUERY);
  }, []);

  useEffect(() => saveApplications(apps), [apps]);

  const fits = useMemo(() => {
    const out: Record<string, FitResult> = {};
    for (const job of jobs) out[job.id] = evaluateFit(profile, job.description);
    return out;
  }, [jobs, profile]);

  const fit = selected ? fits[selected.id] : undefined;
  const resume = useMemo(
    () => (selected ? tailorResume(profile, selected.description, selected.title, selected.company) : ''),
    [profile, selected],
  );
  const letter = useMemo(
    () => (selected ? coverLetter(profile, selected.description, selected.company, selected.title, name.trim() || undefined) : ''),
    [profile, selected, name],
  );
  const tracked = selected ? apps.some((a) => a.jobId === selected.id) : false;

  const track = () => {
    if (!selected) return;
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setApps((cur) => upsertApplication(cur, {
      jobId: selected.id, company: selected.company, role: selected.title, portal: selected.portal,
      status: 'saved', date, notes: '',
    }));
  };
  const setStatus = (jobId: string, status: Status) =>
    setApps((cur) => cur.map((a) => (a.jobId === jobId ? { ...a, status } : a)));
  const remove = (jobId: string) => setApps((cur) => cur.filter((a) => a.jobId !== jobId));

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-3">
          <SearchPanel initial={INITIAL_QUERY} busy={busy} onSearch={runSearch} />
          <p className="px-1 text-xs text-slate-500" aria-live="polite">
            {busy ? 'Searching…' : `${jobs.length} posting${jobs.length === 1 ? '' : 's'} · badge = your fit score`}
          </p>
          <div className="lg:max-h-[calc(100vh-380px)] lg:min-h-[320px] lg:overflow-y-auto lg:pr-1">
            <JobList jobs={jobs} selectedId={selected?.id ?? null} fits={fits} onSelect={(j) => setSelected(j)} />
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <details className="card p-4">
            <summary className="flex cursor-pointer items-center gap-2 font-semibold">
              <UserRound size={17} /> Your profile <span className="text-sm font-normal text-slate-500">(edit to re-score every posting)</span>
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_200px]">
              <textarea aria-label="Candidate profile" className="input min-h-[200px] font-mono text-[13px]" value={profile}
                onChange={(e) => setProfile(e.target.value)} />
              <div>
                <label className="label" htmlFor="cand-name">Name on letters</label>
                <input id="cand-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
                <p className="mt-2 text-xs text-slate-500">Write achievements as “- ” bullet lines. The resume tool ranks them; it never invents new ones.</p>
              </div>
            </div>
          </details>

          {selected && fit ? (
            <section className="card p-4" aria-labelledby="job-h">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="job-h" className="text-xl font-bold">{selected.title}</h2>
                  <p className="text-slate-600">{selected.company} · {selected.location}{selected.salary ? ` · ${selected.salary}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <a className="btn-ghost" href={selected.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open</a>
                  <button type="button" className="btn-primary" onClick={track} disabled={tracked}>
                    <BookmarkPlus size={15} /> {tracked ? 'Tracked' : 'Track'}
                  </button>
                </div>
              </div>

              <div role="tablist" aria-label="Job tools" className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200">
                {TABS.map((t) => (
                  <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                    className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${tab === t.id ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div role="tabpanel" className="pt-4">
                {tab === 'fit' && <FitPanel fit={fit} />}
                {tab === 'resume' && <DocPanel text={resume} filename={`Tailored_CV_${slug(selected.company)}.md`} />}
                {tab === 'letter' && <DocPanel text={letter} filename={`Cover_Letter_${slug(selected.company)}.md`} />}
                {tab === 'posting' && (
                  <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">{selected.description}</pre>
                )}
              </div>
            </section>
          ) : (
            <section className="card p-8 text-center text-slate-500">{busy ? 'Loading postings…' : 'Select a posting to score it.'}</section>
          )}

          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <TrackerPanel apps={apps} onStatus={setStatus} onRemove={remove} />
            <SalaryCard key={selected?.id ?? 'none'} defaultRole={selected?.title ?? 'Software engineer'} />
          </div>
        </div>
      </main>
      <footer className="pb-8 text-center text-xs text-slate-400">
        Demo with sample postings. The MCP server searches the real portals from Claude Desktop, Cursor or any MCP client.
      </footer>
    </div>
  );
}
