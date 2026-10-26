"""Job-portal adapters. Each returns a list of plain dicts and never raises: a failing portal
contributes an ``{"portal": ..., "error": ...}`` entry so one outage does not sink a search."""

from __future__ import annotations

import re
from datetime import date, datetime, timezone
from typing import Any, Optional

import httpx
from bs4 import BeautifulSoup

from .ats import listing_status

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)
TIMEOUT = 15.0

# Portals discovered through a site-restricted web search (no public API).
SITE_PORTALS: dict[str, str] = {
    "remote_co": "remote.co",
    "careerhound": "careerhound.io",
    "hiredchina": "hiredchina.com",
    "kariyer": "kariyer.net",
}
ALL_PORTALS = ["linkedin", "himalayas", *SITE_PORTALS]

_WORKPLACE = {"onsite": "1", "remote": "2", "hybrid": "3"}


def clean_text(value: Optional[str]) -> str:
    if not value:
        return ""
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def parse_linkedin_cards(html: str, limit: int) -> list[dict[str, Any]]:
    """Parses the LinkedIn jobs-guest search fragment into job dicts."""
    soup = BeautifulSoup(html, "html.parser")
    jobs: list[dict[str, Any]] = []
    for card in soup.select("[data-entity-urn]"):
        urn = card.get("data-entity-urn", "")
        m = re.search(r"jobPosting:(\d+)", urn)
        if not m:
            continue
        job_id = m.group(1)
        title = card.select_one(".base-search-card__title")
        company = card.select_one(".base-search-card__subtitle")
        location = card.select_one(".job-search-card__location")
        posted = card.select_one("time")
        link = card.select_one("a.base-card__full-link")
        jobs.append({
            "id": job_id,
            "title": clean_text(title.get_text()) if title else f"LinkedIn job {job_id}",
            "company": clean_text(company.get_text()) if company else "",
            "location": clean_text(location.get_text()) if location else "",
            "posted": posted.get("datetime", "") if posted else "",
            "url": (link.get("href", "").split("?")[0] if link else "")
                   or f"https://www.linkedin.com/jobs/view/{job_id}",
            "portal": "linkedin",
        })
        if len(jobs) >= limit:
            break
    return jobs


async def search_linkedin(
    client: httpx.AsyncClient,
    query: str,
    location: str,
    workplace: Optional[str],
    max_age_days: Optional[int],
    limit: int,
) -> list[dict[str, Any]]:
    params = {"keywords": query, "location": location, "start": "0"}
    if max_age_days:
        params["f_TPR"] = f"r{max_age_days * 86400}"
    if workplace and workplace.lower() in _WORKPLACE:
        params["f_WT"] = _WORKPLACE[workplace.lower()]
    try:
        resp = await client.get(
            "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search", params=params
        )
        if resp.status_code != 200:
            return [{"portal": "linkedin", "error": f"HTTP {resp.status_code}"}]
        return parse_linkedin_cards(resp.text, limit)
    except httpx.HTTPError as exc:
        return [{"portal": "linkedin", "error": str(exc) or exc.__class__.__name__}]


def parse_linkedin_detail(job_id: str, html: str, today: Optional[date] = None) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    def text_of(selector: str) -> str:
        node = soup.select_one(selector)
        return clean_text(node.get_text()) if node else ""

    description_node = soup.select_one(".show-more-less-html__markup, .description__text")
    description = description_node.get_text("\n", strip=True) if description_node else ""
    criteria = {}
    for item in soup.select(".description__job-criteria-item"):
        key = item.select_one(".description__job-criteria-subheader")
        val = item.select_one(".description__job-criteria-text")
        if key and val:
            criteria[clean_text(key.get_text())] = clean_text(val.get_text())
    status = listing_status(soup.get_text(" ", strip=True), today)
    return {
        "id": job_id,
        "title": text_of(".top-card-layout__title, .topcard__title"),
        "company": text_of(".topcard__org-name-link, .topcard__flavor"),
        "location": text_of(".topcard__flavor--bullet"),
        "description": description,
        "criteria": criteria,
        "url": f"https://www.linkedin.com/jobs/view/{job_id}",
        "portal": "linkedin",
        **status.to_dict(),
    }


async def linkedin_detail(client: httpx.AsyncClient, job_id: str) -> dict[str, Any]:
    try:
        resp = await client.get(f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}")
    except httpx.HTTPError as exc:
        return {"id": job_id, "portal": "linkedin", "error": str(exc) or exc.__class__.__name__}
    if resp.status_code in (404, 410):
        return {"id": job_id, "portal": "linkedin", "status": "EXPIRED", "is_active": False,
                "reason": f"LinkedIn returned HTTP {resp.status_code}."}
    if resp.status_code != 200:
        return {"id": job_id, "portal": "linkedin", "error": f"HTTP {resp.status_code}"}
    return parse_linkedin_detail(job_id, resp.text)


def filter_himalayas(payload: dict[str, Any], query: str, limit: int) -> list[dict[str, Any]]:
    words = [w for w in query.lower().split() if len(w) > 1]
    jobs: list[dict[str, Any]] = []
    for job in payload.get("jobs", []):
        title = job.get("title") or ""
        haystack = " ".join([title, " ".join(job.get("categories") or []), job.get("excerpt") or ""]).lower()
        if words and not any(w in haystack for w in words):
            continue
        salary = ""
        if job.get("minSalary") and job.get("maxSalary"):
            salary = f"{job['minSalary']:,}-{job['maxSalary']:,} {job.get('currency') or 'USD'}"
        restrictions = job.get("locationRestrictions") or []
        posted = ""
        if isinstance(job.get("pubDate"), (int, float)):
            posted = datetime.fromtimestamp(job["pubDate"], tz=timezone.utc).date().isoformat()
        jobs.append({
            "id": job.get("guid") or "",
            "title": title,
            "company": job.get("companyName") or "",
            "location": "Remote" + (f" ({', '.join(restrictions)})" if restrictions else ""),
            "salary": salary,
            "posted": posted,
            "url": job.get("applicationLink") or job.get("guid") or "",
            "portal": "himalayas",
        })
        if len(jobs) >= limit:
            break
    return jobs


async def search_himalayas(client: httpx.AsyncClient, query: str, limit: int) -> list[dict[str, Any]]:
    try:
        resp = await client.get("https://himalayas.app/jobs/api/search", params={"q": query})
        if resp.status_code != 200:
            return [{"portal": "himalayas", "error": f"HTTP {resp.status_code}"}]
        return filter_himalayas(resp.json(), query, limit)
    except (httpx.HTTPError, ValueError) as exc:
        return [{"portal": "himalayas", "error": str(exc) or exc.__class__.__name__}]


def _ddg_timelimit(max_age_days: Optional[int]) -> Optional[str]:
    if max_age_days is None:
        return None
    if max_age_days <= 1:
        return "d"
    if max_age_days <= 7:
        return "w"
    if max_age_days <= 31:
        return "m"
    return None


def search_site(portal: str, query: str, max_age_days: Optional[int], limit: int) -> list[dict[str, Any]]:
    """Finds fresh postings on a portal without an API via a site-restricted DuckDuckGo search."""
    from ddgs import DDGS  # imported lazily: slow import, only needed for these portals

    site = SITE_PORTALS[portal]
    timelimit = _ddg_timelimit(max_age_days)
    jobs: list[dict[str, Any]] = []
    seen: set[str] = set()
    try:
        raw = DDGS().text(f"site:{site} {query}", max_results=limit * 3, timelimit=timelimit) or []
    except Exception as exc:  # ddgs raises its own exception hierarchy
        return [{"portal": portal, "error": str(exc) or exc.__class__.__name__}]
    for item in raw:
        url = item.get("href") or ""
        if not url or url in seen or url.rstrip("/").endswith(site):
            continue
        title = clean_text(item.get("title"))
        snippet = clean_text(item.get("body"))
        if not listing_status(f"{title} {snippet}").is_active:
            continue
        seen.add(url)
        jobs.append({
            "id": url,
            "title": re.sub(rf"\s*[-|]\s*[^-|]*{re.escape(site)}.*$", "", title, flags=re.I) or title,
            "company": "",
            "location": "Türkiye" if portal == "kariyer" else "See posting",
            "snippet": snippet,
            "url": url,
            "portal": portal,
        })
        if len(jobs) >= limit:
            break
    return jobs


async def fetch_page(client: httpx.AsyncClient, url: str) -> dict[str, Any]:
    """Generic job page fetch for any portal or company careers page."""
    try:
        resp = await client.get(url)
    except httpx.HTTPError as exc:
        return {"url": url, "error": str(exc) or exc.__class__.__name__}
    if resp.status_code in (404, 410):
        return {"url": url, "status": "EXPIRED", "is_active": False,
                "reason": f"The page returned HTTP {resp.status_code}."}
    if resp.status_code != 200:
        return {"url": url, "error": f"HTTP {resp.status_code}"}
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text("\n", strip=True)
    title = clean_text(soup.title.get_text()) if soup.title else ""
    portal = next((key for key, site in SITE_PORTALS.items() if site in url), "web")
    return {"url": url, "title": title, "company": "", "description": text[:8000], "portal": portal,
            **listing_status(f"{title}\n{text}").to_dict()}


def http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        timeout=TIMEOUT, follow_redirects=True,
        headers={"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"},
    )
