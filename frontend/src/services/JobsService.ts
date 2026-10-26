import { seedJobs, type Job, type Portal, type Workplace } from '../domain/seed';

export interface SearchQuery {
  query: string;
  portal: Portal | 'all';
  workplace: Workplace | 'any';
  maxAgeDays: number;
}

/** The UI talks to this interface only. The demo ships the mock; a live client would call the MCP server. */
export interface JobsService {
  search(q: SearchQuery): Promise<Job[]>;
}

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'job', 'jobs', 'remote']);

export function matchesQuery(job: Job, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  if (words.length === 0) return true;
  const hay = `${job.title} ${job.company} ${job.location} ${job.description}`.toLowerCase();
  return words.some((w) => hay.includes(w));
}

/** Rank: more query words in the title first, then newest. */
function relevance(job: Job, query: string): number {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  const title = job.title.toLowerCase();
  return words.filter((w) => title.includes(w)).length;
}

export class MockJobsService implements JobsService {
  constructor(
    private readonly jobs: Job[] = seedJobs(),
    private readonly latencyMs = 350,
  ) {}

  async search(q: SearchQuery): Promise<Job[]> {
    if (this.latencyMs) await new Promise((r) => setTimeout(r, this.latencyMs));
    return this.jobs
      .filter((j) => q.portal === 'all' || j.portal === q.portal)
      .filter((j) => q.workplace === 'any' || j.workplace === q.workplace)
      .filter((j) => j.postedDaysAgo <= q.maxAgeDays)
      .filter((j) => matchesQuery(j, q.query))
      .sort((a, b) => relevance(b, q.query) - relevance(a, q.query) || a.postedDaysAgo - b.postedDaysAgo);
  }
}
