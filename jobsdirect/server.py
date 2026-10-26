"""JobsDirect MCP server: tool definitions. Run with ``python -m jobsdirect`` or ``jobsdirect``."""

from __future__ import annotations

import asyncio
import json
import os
import re
from pathlib import Path
from typing import Any, Optional

from fastmcp import FastMCP

from . import portals
from .ats import evaluate_fit
from .salary import benchmark
from .tracker import Tracker, TrackerError
from .writer import cover_letter, export_docx, tailor_resume

mcp = FastMCP(
    "JobsDirect",
    instructions=(
        "Job search across LinkedIn, Himalayas, Remote.co, CareerHound, HiredChina and Kariyer.net, "
        "4-tier ATS fit scoring, resume tailoring, cover letters, Word export and an application tracker. "
        "Typical chain: search_jobs -> get_job_details -> evaluate_job_fit -> tailor_resume / "
        "generate_cover_letter -> export_to_docx -> track_application."
    ),
)


def output_dir() -> Path:
    """Where files are written: $JOBSDIRECT_OUTPUT_DIR, else ~/Desktop if it exists, else ~/JobsDirect."""
    env = os.environ.get("JOBSDIRECT_OUTPUT_DIR")
    if env:
        return Path(env).expanduser()
    desktop = Path.home() / "Desktop"
    return desktop if desktop.is_dir() else Path.home() / "JobsDirect"


def _json(data: Any) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False)


async def search_jobs(
    query: str,
    location: str = "Remote",
    portal: str = "all",
    workplace: Optional[str] = None,
    max_age_days: Optional[int] = 14,
    limit: int = 10,
) -> str:
    """Search open job postings.

    Args:
        query: Keywords, e.g. "senior project manager".
        location: City/country or "Remote" (used by LinkedIn).
        portal: linkedin, himalayas, remote_co, careerhound, hiredchina, kariyer, or all.
        workplace: Optional LinkedIn filter: remote, hybrid or onsite.
        max_age_days: Only postings from the last N days (default 14) to skip stale listings.
        limit: Max results per portal (1-25).
    """
    limit = max(1, min(int(limit), 25))
    wanted = portals.ALL_PORTALS if portal.lower() == "all" else [portal.lower().replace(".", "_")]
    unknown = [p for p in wanted if p not in portals.ALL_PORTALS]
    if unknown:
        return _json({"error": f"Unknown portal '{portal}'. Use one of: all, {', '.join(portals.ALL_PORTALS)}."})

    async with portals.http_client() as client:
        tasks = []
        for name in wanted:
            if name == "linkedin":
                tasks.append(portals.search_linkedin(client, query, location, workplace, max_age_days, limit))
            elif name == "himalayas":
                tasks.append(portals.search_himalayas(client, query, limit))
            else:
                tasks.append(asyncio.to_thread(portals.search_site, name, query, max_age_days, limit))
        batches = await asyncio.gather(*tasks)

    jobs = [job for batch in batches for job in batch if "error" not in job]
    errors = [job for batch in batches for job in batch if "error" in job]
    return _json({"query": query, "count": len(jobs), "jobs": jobs, "portal_errors": errors})


async def get_job_details(job_id_or_url: str) -> str:
    """Full description, criteria and open/closed status for a job ID (LinkedIn) or any posting URL."""
    ref = job_id_or_url.strip()
    async with portals.http_client() as client:
        if "linkedin.com" in ref or ref.isdigit():
            m = re.search(r"(\d{6,})", ref)
            if not m:
                return _json({"error": f"No LinkedIn job ID found in '{ref}'."})
            return _json(await portals.linkedin_detail(client, m.group(1)))
        if ref.startswith(("http://", "https://")):
            return _json(await portals.fetch_page(client, ref))
    return _json({"error": "Pass a LinkedIn job ID or a full http(s) URL."})


def evaluate_job_fit(
    candidate_profile: str,
    job_description: str,
    candidate_languages: Optional[list[str]] = None,
    work_authorized: Optional[bool] = None,
) -> str:
    """Score candidate-to-job fit 0-100 with the 4-tier ATS engine.

    Tiers: industry/domain affinity (40), degree + years gate (20), skills overlap (30),
    language and work-authorisation gate (10, a missing required language fails the gate).

    Args:
        candidate_profile: Resume / profile text.
        job_description: Full posting text.
        candidate_languages: e.g. ["English", "Turkish"]. Omit to detect from the profile.
        work_authorized: True if the candidate may work where the job is (no sponsorship needed).
    """
    return _json(evaluate_fit(candidate_profile, job_description, candidate_languages, work_authorized))


def tailor_resume_tool(candidate_cv: str, job_description: str, target_role: Optional[str] = None,
                       target_company: Optional[str] = None) -> str:
    """Re-rank the candidate's own CV bullets by relevance to the job, list matched/missing keywords,
    and flag bullets that need a metric. Returns Markdown (feed it to export_to_docx)."""
    return tailor_resume(candidate_cv, job_description, target_role, target_company)


def generate_cover_letter(candidate_profile: str, job_description: str, company_name: str, job_title: str,
                          candidate_name: Optional[str] = None, hiring_manager: Optional[str] = None) -> str:
    """Draft a short cover letter that cites the candidate's two most relevant achievements."""
    return cover_letter(candidate_profile, job_description, company_name, job_title, candidate_name,
                        hiring_manager)


def export_to_docx(title: str, content: str, filename: Optional[str] = None) -> str:
    """Save Markdown text (resume, cover letter, report) as a Word .docx in the output folder."""
    try:
        path = export_docx(title, content, output_dir(), filename)
    except OSError as exc:
        return _json({"status": "error", "message": f"Could not write the file: {exc}"})
    return _json({"status": "ok", "file_path": str(path)})


async def prepare_job_application(job_id_or_url: str, candidate_profile: str,
                                  candidate_name: Optional[str] = None) -> str:
    """One call: fetch the posting, score fit, tailor the resume and draft the cover letter."""
    details = json.loads(await get_job_details(job_id_or_url))
    if "error" in details:
        return _json(details)
    title = details.get("title") or "the role"
    company = details.get("company") or "the company"
    description = details.get("description") or ""
    return _json({
        "job": {k: details.get(k) for k in ("title", "company", "url", "portal", "status")},
        "evaluation": evaluate_fit(candidate_profile, description),
        "tailored_resume": tailor_resume(candidate_profile, description, title, company),
        "cover_letter": cover_letter(candidate_profile, description, company, title, candidate_name),
        "next_steps": ["Review the gaps list", f"Apply at {details.get('url')}",
                       "Call export_to_docx for Word copies", "Log it with track_application"],
    })


def track_application(action: str = "list", job_id: str = "", company: str = "", role: str = "",
                      portal: str = "", status: str = "applied", salary: str = "",
                      notes: Optional[str] = None) -> str:
    """Manage the applications CSV (job_applications.csv in the output folder).

    Args:
        action: "add", "update" (status/notes) or "list".
        job_id: Job ID or URL (used as the key; or use company + role).
        status: saved, applied, interviewing, offer, rejected, withdrawn.
    """
    tracker = Tracker(output_dir() / "job_applications.csv")
    try:
        if action == "list":
            return _json({"file": str(tracker.path), "applications": tracker.list()})
        if action == "add":
            return _json({"added": tracker.add(job_id, company, role, portal, status, salary, notes or ""),
                          "file": str(tracker.path)})
        if action == "update":
            return _json({"updated": tracker.update(job_id, company, role, status, notes)})
    except TrackerError as exc:
        return _json({"error": str(exc)})
    return _json({"error": "action must be add, update or list."})


def lookup_salary_benchmark(role: str, location: Optional[str] = None) -> str:
    """Indicative junior/mid/senior annual salary bands for a role in US, EU, UK, Türkiye or remote."""
    return _json(benchmark(role, location))


for _fn in (search_jobs, get_job_details, evaluate_job_fit, generate_cover_letter, export_to_docx,
            prepare_job_application, track_application, lookup_salary_benchmark):
    mcp.tool(_fn)
mcp.tool(tailor_resume_tool, name="tailor_resume")


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
