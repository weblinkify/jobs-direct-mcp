# JobsDirect MCP

**Live demo:** https://jobs-direct-mcp.vercel.app (mock mode, runs fully in the browser) · deploys automatically on every push to `main`

An MCP server that lets Claude Desktop, Cursor or any MCP client search six job portals, score how well
you fit each posting, and prepare the application: a tailored resume, a cover letter, a Word file and a
tracker entry. It runs locally; your CV never leaves your machine.

| | |
|---|---|
| **MCP server** | Python 3.10+ · FastMCP · httpx · BeautifulSoup · python-docx |
| **Web demo** | React 18 · TypeScript · Tailwind CSS · Vite, deployed on Vercel |
| **Portals** | LinkedIn · Himalayas · Remote.co · CareerHound · HiredChina · Kariyer.net |

---

## Tools

| Tool | What it does |
|---|---|
| `search_jobs` | Searches one or all portals. Filters by workplace (remote/hybrid/onsite) and posting age, and drops postings that say they are closed. |
| `get_job_details` | Full description, criteria and open/closed status for a LinkedIn job ID or any posting URL. |
| `evaluate_job_fit` | 4-tier ATS score (0-100) with a verdict and the reasons behind it. |
| `tailor_resume` | Re-ranks *your own* CV bullets by relevance, lists matched and missing keywords, flags bullets without a metric. It does not invent experience. |
| `generate_cover_letter` | Short letter citing your two most relevant achievements. |
| `export_to_docx` | Saves Markdown as a Word document. |
| `prepare_job_application` | Fetch + score + resume + letter in one call. |
| `track_application` | Add, update and list applications in `job_applications.csv`. |
| `lookup_salary_benchmark` | Indicative junior/mid/senior bands for US, EU, UK, Türkiye and remote. |

### The 4-tier fit score

```
Fit (0-100) =
  Tier 1  Industry affinity        40   your industry keywords vs. the employer's
  Tier 2  Qualifications gate      20   degree level + years of experience (a "3-5 years" range counts as 3)
  Tier 3  Skills overlap           30   tools and methods the posting names that your CV also names
  Tier 4  Language & eligibility   10   a missing required language fails the gate; clearance / citizenship
                                        wording asks you to confirm work authorisation
```

Verdicts: `STRONG_MATCH` (80+), `MODERATE_MATCH` (60+), `WEAK_MATCH`, plus gate verdicts that override the
number: `CLOSED` (closure notice or a past deadline, in English or Turkish), `LANGUAGE_GATE_FAILED`,
`VERIFY_ELIGIBILITY`, `NOT_ELIGIBLE` and `POOR_DOMAIN_FIT`. A posting for crypto trading will not score
well for a heavy-machinery project manager just because both mention "Agile".

---

## Install

```bash
git clone https://github.com/weblinkify/jobs-direct-mcp
cd jobs-direct-mcp
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -e .
```

Add it to your MCP client (`claude_desktop_config.json`, Cursor `mcp.json`, …):

```json
{
  "mcpServers": {
    "jobsdirect": {
      "command": "/ABSOLUTE/PATH/jobs-direct-mcp/.venv/bin/jobsdirect",
      "env": { "JOBSDIRECT_OUTPUT_DIR": "~/Desktop" }
    }
  }
}
```

On Windows the command is `C:\\path\\jobs-direct-mcp\\.venv\\Scripts\\jobsdirect.exe`. Files (Word exports, the
tracker CSV) go to `JOBSDIRECT_OUTPUT_DIR`, else your Desktop, else `~/JobsDirect`.

### Example prompt

```text
I'm looking for remote senior frontend roles in Europe. My CV is attached.
1. search_jobs for "senior frontend react" on all portals, last 7 days.
2. evaluate_job_fit for each result against my CV and pick the top 2.
3. tailor_resume and generate_cover_letter for the best one, then export_to_docx.
4. track_application with status "saved".
```

---

## Web demo

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The demo uses sample postings (fictional companies) but the scoring and writing are real: the browser runs a
TypeScript port of the Python engine. Edit the profile and every posting re-scores. Tracked applications
stay in your browser's local storage and export to CSV.

The two engines stay identical: `fixtures/generate.py` writes `fixtures/ats_cases.json` from the Python
code, and both `tests/test_parity.py` and `frontend/src/__tests__/parity.test.ts` assert against it.

### Deploy on Vercel

Import the repo in Vercel and set **Root Directory** to `frontend`. `frontend/vercel.json` handles the
rest (Vite build, SPA rewrite, cache and security headers). No environment variables are needed.

---

## Development

```bash
make install   # dependencies and git hooks
make check     # lint, types, tests and build: everything CI runs before merge
make audit     # pip-audit and npm audit
python fixtures/generate.py      # after changing jobsdirect/ats.py
```

## Notes

- Portal markup changes from time to time. Each portal fails on its own and is reported in
  `portal_errors`, so one broken source does not stop a search.
- Respect each site's terms of use and rate limits; this tool fetches only public pages, one request per search.
- Salary bands are indicative planning numbers, not live market data.

## License

MIT
