import { Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PORTALS } from '../domain/seed';
import type { SearchQuery } from '../services/JobsService';

export function SearchPanel({ initial, busy, onSearch }: {
  initial: SearchQuery;
  busy: boolean;
  onSearch: (q: SearchQuery) => void;
}) {
  const [q, setQ] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(q);
  };
  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <div>
        <label className="label" htmlFor="query">Keywords</label>
        <input id="query" className="input" value={q.query} placeholder="e.g. react engineer"
          onChange={(e) => setQ({ ...q, query: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="portal">Portal</label>
          <select id="portal" className="input" value={q.portal}
            onChange={(e) => setQ({ ...q, portal: e.target.value as SearchQuery['portal'] })}>
            <option value="all">All 6 portals</option>
            {PORTALS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="workplace">Workplace</label>
          <select id="workplace" className="input" value={q.workplace}
            onChange={(e) => setQ({ ...q, workplace: e.target.value as SearchQuery['workplace'] })}>
            <option value="any">Any</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="age">Posted within</label>
        <select id="age" className="input" value={q.maxAgeDays}
          onChange={(e) => setQ({ ...q, maxAgeDays: Number(e.target.value) })}>
          <option value={1}>24 hours</option>
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>
      </div>
      <button className="btn-primary w-full" disabled={busy}>
        <Search size={16} /> {busy ? 'Searching…' : 'Search jobs'}
      </button>
    </form>
  );
}
