import { useState } from 'react';
import { MARKETS, benchmark, type Market } from '../domain/salary';

const fmt = ([lo, hi]: [number, number], cur: string) => `${lo.toLocaleString('en-US')}k – ${hi.toLocaleString('en-US')}k ${cur}`;

export function SalaryCard({ defaultRole }: { defaultRole: string }) {
  const [role, setRole] = useState(defaultRole);
  const [market, setMarket] = useState<Market>('REMOTE');
  const b = benchmark(role, market);
  return (
    <section className="card p-4" aria-labelledby="salary-h">
      <h2 id="salary-h" className="mb-3 font-semibold">Salary benchmark</h2>
      <div className="grid grid-cols-2 gap-2">
        <input aria-label="Role" className="input" value={role} onChange={(e) => setRole(e.target.value)} />
        <select aria-label="Market" className="input" value={market} onChange={(e) => setMarket(e.target.value as Market)}>
          {MARKETS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>
      {b ? (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          {(['junior', 'mid', 'senior'] as const).map((lvl) => (
            <div key={lvl} className="rounded-lg bg-slate-50 p-2">
              <dt className="text-xs uppercase tracking-wide text-slate-500">{lvl}</dt>
              <dd className="font-medium tabular-nums">{fmt(b[lvl], b.currency)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No band for that role. Try engineer, data scientist, product/project manager, operations or designer.</p>
      )}
      <p className="mt-2 text-xs text-slate-400">Annual gross, indicative planning bands{b ? ` for “${b.matchedRole}”` : ''}.</p>
    </section>
  );
}
