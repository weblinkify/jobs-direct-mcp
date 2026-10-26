export const STATUSES = ['saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'] as const;
export type Status = (typeof STATUSES)[number];

export interface Application {
  jobId: string;
  company: string;
  role: string;
  portal: string;
  status: Status;
  date: string;
  notes: string;
}

const KEY = 'jobsdirect.tracker.v1';

/** Browser stand-in for the server's CSV tracker. Storage can be unavailable (private mode), so
 * every access is guarded and the app keeps working in memory. */
export function loadApplications(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): Application[] {
  try {
    const raw = storage?.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isApplication) : [];
  } catch {
    return [];
  }
}

export function saveApplications(apps: Application[], storage: Pick<Storage, 'setItem'> | undefined = safeStorage()) {
  try {
    storage?.setItem(KEY, JSON.stringify(apps));
  } catch {
    /* storage full or blocked: keep in memory only */
  }
}

export function upsertApplication(apps: Application[], app: Application): Application[] {
  const i = apps.findIndex((a) => a.jobId === app.jobId);
  if (i === -1) return [app, ...apps];
  const next = [...apps];
  next[i] = { ...apps[i], ...app, date: apps[i].date };
  return next;
}

export function toCsv(apps: Application[]): string {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = ['date', 'job_id', 'company', 'role', 'portal', 'status', 'notes'];
  const rows = apps.map((a) => [a.date, a.jobId, a.company, a.role, a.portal, a.status, a.notes].map(cell).join(','));
  return [header.join(','), ...rows].join('\n') + '\n';
}

function isApplication(v: unknown): v is Application {
  const a = v as Application;
  return Boolean(a) && typeof a.jobId === 'string' && typeof a.company === 'string' &&
    typeof a.role === 'string' && (STATUSES as readonly string[]).includes(a.status);
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}
