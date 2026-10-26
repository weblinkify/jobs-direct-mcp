import { Download, Trash2 } from 'lucide-react';
import { STATUSES, toCsv, type Application, type Status } from '../services/tracker';
import { downloadText } from '../download';

export function TrackerPanel({ apps, onStatus, onRemove }: {
  apps: Application[];
  onStatus: (jobId: string, status: Status) => void;
  onRemove: (jobId: string) => void;
}) {
  return (
    <section className="card p-4" aria-labelledby="tracker-h">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="tracker-h" className="font-semibold">Application tracker <span className="text-slate-400">({apps.length})</span></h2>
        <button type="button" className="btn-ghost" disabled={!apps.length}
          onClick={() => downloadText('job_applications.csv', toCsv(apps), 'text/csv')}>
          <Download size={15} /> CSV
        </button>
      </div>
      {apps.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing tracked yet. Open a posting and press “Track”.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="py-1.5">Date</th><th>Company</th><th>Role</th><th>Status</th><th className="sr-only">Remove</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {apps.map((a) => (
                <tr key={a.jobId}>
                  <td className="py-2 tabular-nums text-slate-500">{a.date}</td>
                  <td className="font-medium">{a.company}</td>
                  <td>{a.role}</td>
                  <td>
                    <select aria-label={`Status for ${a.role} at ${a.company}`} className="rounded border border-slate-200 px-1.5 py-1 text-sm"
                      value={a.status} onChange={(e) => onStatus(a.jobId, e.target.value as Status)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="text-right">
                    <button type="button" aria-label={`Remove ${a.role} at ${a.company}`} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => onRemove(a.jobId)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
