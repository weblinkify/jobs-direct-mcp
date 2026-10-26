import { Briefcase, Github } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">JobsDirect</h1>
            <p className="text-xs text-slate-500">Multi-portal job search · 4-tier ATS fit score · tailored applications</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip bg-amber-100 text-amber-800" title="Search results are sample postings. Scoring and writing run for real in your browser.">
            Demo · mock data
          </span>
          <a className="btn-ghost" href="https://github.com/weblinkify/jobs-direct-mcp" target="_blank" rel="noreferrer">
            <Github size={16} /> MCP server
          </a>
        </div>
      </div>
    </header>
  );
}
