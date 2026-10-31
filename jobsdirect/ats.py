"""Pure, network-free scoring logic: the 4-tier ATS fit engine and listing-expiry detection.

Everything here is deterministic and covered by tests/test_ats.py. The same rules are ported to
frontend/src/domain/ats.ts and both implementations are checked against fixtures/ats_cases.json.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

INDUSTRY_TAXONOMY: dict[str, list[str]] = {
    "Fintech & Financial Services": [
        "fintech",
        "banking",
        "payments",
        "card payments",
        "merchant",
        "checkout",
        "forex",
        "brokerage",
        "trading",
        "crypto",
        "blockchain",
        "web3",
        "lending",
        "credit",
        "securities",
        "wealthtech",
        "insurance",
        "insurtech",
    ],
    "Industrial & Manufacturing": [
        "manufacturing",
        "industrial",
        "heavy machinery",
        "machinery",
        "automotive",
        "aerospace",
        "factory",
        "plant",
        "supply chain",
        "logistics",
        "freight",
        "warehouse",
        "procurement",
        "mechanical",
        "sensors",
        "automation hardware",
    ],
    "Healthcare & Life Sciences": [
        "healthcare",
        "hospital",
        "clinical",
        "pharma",
        "pharmaceutical",
        "biotech",
        "medical device",
        "life sciences",
        "diagnostics",
        "genomics",
        "healthtech",
        "patient",
    ],
    "E-Commerce & Retail": [
        "ecommerce",
        "e-commerce",
        "retail",
        "shopify",
        "d2c",
        "marketplace",
        "consumer goods",
        "fmcg",
        "omnichannel",
        "merchandising",
    ],
    "Software & SaaS": [
        "saas",
        "enterprise software",
        "cloud",
        "devops",
        "cybersecurity",
        "infrastructure",
        "data engineering",
        "developer tools",
        "b2b software",
        "platform",
        "microservices",
        "api",
        "apis",
    ],
    "Media & Gaming": [
        "gaming",
        "game dev",
        "unity",
        "unreal",
        "streaming",
        "media",
        "entertainment",
        "broadcasting",
        "animation",
    ],
    "Energy & Cleantech": [
        "energy",
        "oil & gas",
        "renewables",
        "solar",
        "wind",
        "power grid",
        "utilities",
        "cleantech",
        "sustainability",
        "battery",
        "ev charging",
    ],
    "Education & EdTech": [
        "education",
        "edtech",
        "e-learning",
        "university",
        "curriculum",
        "academic",
    ],
    "Telecom & Networking": [
        "telecom",
        "telecommunications",
        "networking",
        "5g",
        "wireless",
        "broadband",
        "isp",
    ],
}

SKILL_LEXICON: list[str] = [
    "agile",
    "scrum",
    "kanban",
    "jira",
    "confluence",
    "project management",
    "pmp",
    "stakeholder management",
    "roadmap",
    "kpi",
    "okr",
    "budget",
    "p&l",
    "cross-functional",
    "vendor management",
    "python",
    "javascript",
    "typescript",
    "react",
    "node.js",
    "java",
    "golang",
    "sql",
    "postgresql",
    "aws",
    "gcp",
    "azure",
    "docker",
    "kubernetes",
    "terraform",
    "git",
    "ci/cd",
    "rest api",
    "graphql",
    "machine learning",
    "data analytics",
    "power bi",
    "tableau",
    "crm",
    "erp",
    "salesforce",
    "hubspot",
    "b2b sales",
    "figma",
]

LANGUAGES: list[str] = [
    "english",
    "turkish",
    "german",
    "french",
    "spanish",
    "italian",
    "dutch",
    "swedish",
    "finnish",
    "danish",
    "norwegian",
    "polish",
    "portuguese",
    "russian",
    "arabic",
    "mandarin",
    "chinese",
    "japanese",
    "korean",
    "hindi",
    "urdu",
]

CLEARANCE_PHRASES: list[str] = [
    "security clearance",
    "top secret",
    "must be a citizen",
    "citizenship required",
    "must hold citizenship",
    "no visa sponsorship",
    "eligible to work in the us without sponsorship",
]

WEIGHTS = {"domain": 40, "qualifications": 20, "skills": 30, "logistics": 10}


def round_half_up(value: float, digits: int = 0) -> float:
    """Half-up rounding, identical to the TypeScript port (Python's built-in uses banker's rounding)."""
    factor: float = 10**digits
    return math.floor(value * factor + 0.5) / factor


def has_term(term: str, text_lower: str) -> bool:
    """Whole-term match that also works for terms containing punctuation (ci/cd, node.js, p&l)."""
    return re.search(rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", text_lower) is not None


def count_term(term: str, text_lower: str) -> int:
    return len(re.findall(rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", text_lower))


def extract_domains(text: str) -> dict[str, int]:
    """Counts taxonomy keyword hits per industry domain."""
    lower = text.lower()
    counts: dict[str, int] = {}
    for domain, keywords in INDUSTRY_TAXONOMY.items():
        hits = sum(count_term(kw, lower) for kw in keywords)
        if hits:
            counts[domain] = hits
    return counts


def domain_affinity(cand: dict[str, int], job: dict[str, int]) -> float:
    """0..1 overlap between the candidate's industry footprint and the job's industry focus.

    Each job domain contributes by its share of the job's keyword hits; the candidate earns that
    share in proportion to how strongly they show the domain (3+ hits = full strength).
    A job with no detectable industry is horizontal: anyone gets 0.85.
    """
    if not job:
        return 0.85
    total = sum(job.values())
    score = 0.0
    for domain, count in job.items():
        if domain in cand:
            score += (count / total) * min(cand[domain] / 3.0, 1.0)
    return max(0.0, min(score, 1.0))


_RANGE_RE = re.compile(r"(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?)", re.I)
_SINGLE_RE = re.compile(r"(\d{1,2})\s*\+?\s*(?:years?|yrs?)", re.I)


def required_years(text: str) -> int | None:
    """Minimum years of experience a posting asks for. For a range like "3-5 years" the floor (3) counts."""
    found: list[int] = []
    spans: list[tuple[int, int]] = []
    for m in _RANGE_RE.finditer(text):
        found.append(int(m.group(1)))
        spans.append(m.span())
    for m in _SINGLE_RE.finditer(text):
        if any(s <= m.start() < e for s, e in spans):
            continue
        found.append(int(m.group(1)))
    return max(found) if found else None


def candidate_years(text: str) -> int | None:
    """Years of experience a candidate states. Ranges count by their upper bound."""
    found: list[int] = []
    spans: list[tuple[int, int]] = []
    for m in _RANGE_RE.finditer(text):
        found.append(int(m.group(2)))
        spans.append(m.span())
    for m in _SINGLE_RE.finditer(text):
        if any(s <= m.start() < e for s, e in spans):
            continue
        found.append(int(m.group(1)))
    return max(found) if found else None


def degree_level(text: str) -> int:
    """0 = none mentioned, 1 = bachelor, 2 = master/MBA, 3 = PhD."""
    t = text.lower()
    if re.search(r"\b(ph\.?d|doctorate|doctoral)\b", t):
        return 3
    if re.search(r"\b(master'?s?\s+(?:degree|of|in)|msc|m\.sc|mba|meng)\b", t):
        return 2
    if re.search(r"\b(bachelor'?s?|bsc|b\.sc|beng|undergraduate degree)\b", t):
        return 1
    return 0


def required_languages(text: str) -> list[str]:
    """Languages the posting explicitly requires (fluent / native / required)."""
    lower = text.lower()
    required: list[str] = []
    for lang in LANGUAGES:
        patterns = [
            rf"\b(?:fluent|fluency|native|proficient|business[- ]level)\s+(?:in\s+)?{lang}\b",
            rf"\b{lang}\s+(?:is\s+)?(?:required|mandatory|essential)\b",
            rf"\b{lang}\s+\(?(?:fluent|native|c1|c2)\)?",
        ]
        if any(re.search(p, lower) for p in patterns):
            required.append(lang)
    return required


# ---------------------------------------------------------------------------
# Listing expiry
# ---------------------------------------------------------------------------

_CLOSED_PATTERNS: list[tuple[str, str]] = [
    (
        r"no longer accepting applications|this job has expired|job is closed|position (?:has been )?filled"
        r"|position closed|posting (?:has )?expired|listing has ended|this job is no longer available",
        "The posting says it is closed.",
    ),
    (
        r"ilan yay[ıi]ndan kald[ıi]r[ıi]lm[ıi][sş]|ba[sş]vuruya kapal[ıi]|ilan(?:[ıi]n)? s[üu]resi dolmu[sş]",
        "The Turkish listing says it is closed (ilan kapanmış).",
    ),
]

_DEADLINE_RE = re.compile(
    r"(?:application deadline|apply by|apply before|closing date|valid until|expires on|son ba[sş]vuru tarihi)"
    r"\s*[:\-]?\s*"
    r"(\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}[./]\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})",
    re.I,
)
_DATE_FORMATS = (
    "%Y-%m-%d",
    "%d.%m.%Y",
    "%d/%m/%Y",
    "%d %B %Y",
    "%d %b %Y",
    "%B %d, %Y",
    "%B %d %Y",
    "%b %d, %Y",
    "%b %d %Y",
)


def parse_deadline(raw: str) -> date | None:
    raw = raw.strip().rstrip(".,")
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


@dataclass(frozen=True)
class ListingStatus:
    is_active: bool
    reason: str
    deadline: str | None = None

    @property
    def status(self) -> str:
        return "ACTIVE" if self.is_active else "EXPIRED"

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "is_active": self.is_active,
            "reason": self.reason,
            "deadline": self.deadline,
        }


def listing_status(text: str, today: date | None = None) -> ListingStatus:
    today = today or date.today()
    lower = text.replace("İ", "i").lower()  # Python lowercases "İ" to "i" + combining dot
    for pattern, reason in _CLOSED_PATTERNS:
        if re.search(pattern, lower):
            return ListingStatus(False, reason)
    m = _DEADLINE_RE.search(text)
    if m:
        deadline = parse_deadline(m.group(1))
        if deadline is not None:
            iso = deadline.isoformat()
            if deadline < today:
                return ListingStatus(False, f"The application deadline ({iso}) has passed.", iso)
            return ListingStatus(True, f"Open until {iso}.", iso)
    return ListingStatus(True, "No closure notice or past deadline found.")


# ---------------------------------------------------------------------------
# 4-tier fit evaluation
# ---------------------------------------------------------------------------


def evaluate_fit(
    candidate_profile: str,
    job_description: str,
    candidate_languages: list[str] | None = None,
    work_authorized: bool | None = None,
    today: date | None = None,
) -> dict[str, Any]:
    """Scores candidate-to-job fit 0-100 across four weighted tiers and returns a verdict.

    Tier 1  industry/domain affinity            40
    Tier 2  degree + years-of-experience gate   20
    Tier 3  functional & technical skills       30
    Tier 4  language and work-authorisation     10 (a missing required language is a hard fail)
    """
    cand_lower = candidate_profile.lower()
    jd_lower = job_description.lower()

    # Tier 1
    cand_domains = extract_domains(candidate_profile)
    job_domains = extract_domains(job_description)
    affinity = domain_affinity(cand_domains, job_domains)
    domain_score = round_half_up(affinity * WEIGHTS["domain"], 1)

    # Tier 2
    req_years = required_years(job_description)
    cand_yrs = candidate_years(candidate_profile)
    req_degree = degree_level(job_description)
    cand_degree = degree_level(candidate_profile)
    degree_ok = cand_degree >= req_degree
    degree_points = 10.0 if degree_ok else 4.0
    if req_years is None:
        years_points = 10.0
    elif cand_yrs is None:
        years_points = 6.0
    else:
        years_points = (
            round_half_up(min(cand_yrs / req_years, 1.0) * 10.0, 1) if req_years > 0 else 10.0
        )
    qualification_score = round_half_up(degree_points + years_points, 1)

    # Tier 3
    job_skills = [s for s in SKILL_LEXICON if has_term(s, jd_lower)]
    matched = [s for s in job_skills if has_term(s, cand_lower)]
    missing = [s for s in job_skills if s not in matched]
    skill_ratio = len(matched) / len(job_skills) if job_skills else 0.8
    skills_score = round_half_up(skill_ratio * WEIGHTS["skills"], 1)

    # Tier 4
    langs_needed = required_languages(job_description)
    cand_langs = {lang.strip().lower() for lang in (candidate_languages or [])}
    if candidate_languages is None:
        cand_langs = {lang for lang in LANGUAGES if has_term(lang, cand_lower)}
    missing_langs = [lang for lang in langs_needed if lang not in cand_langs]
    clearance = next((p for p in CLEARANCE_PHRASES if p in jd_lower), None)

    logistics_score = 10.0
    if clearance and work_authorized is not True:
        logistics_score -= 4.0
    if missing_langs:
        logistics_score = 0.0

    total = int(round_half_up(domain_score + qualification_score + skills_score + logistics_score))
    total = max(0, min(total, 100))

    status = listing_status(job_description, today)
    if not status.is_active:
        total = min(total, 20)
        verdict = "CLOSED"
    elif missing_langs:
        verdict = "LANGUAGE_GATE_FAILED"
    elif clearance and work_authorized is None:
        verdict = "VERIFY_ELIGIBILITY"
    elif clearance and work_authorized is False:
        verdict = "NOT_ELIGIBLE"
    elif job_domains and affinity < 0.2:
        verdict = "POOR_DOMAIN_FIT"
    elif total >= 80:
        verdict = "STRONG_MATCH"
    elif total >= 60:
        verdict = "MODERATE_MATCH"
    else:
        verdict = "WEAK_MATCH"

    return {
        "total_fit_score": total,
        "verdict": verdict,
        "listing": status.to_dict(),
        "tiers": {
            "domain": {
                "score": domain_score,
                "max": WEIGHTS["domain"],
                "affinity": round_half_up(affinity, 3),
                "candidate_domains": sorted(cand_domains),
                "job_domains": sorted(job_domains),
            },
            "qualifications": {
                "score": qualification_score,
                "max": WEIGHTS["qualifications"],
                "required_years": req_years,
                "candidate_years": cand_yrs,
                "required_degree": req_degree,
                "candidate_degree": cand_degree,
                "degree_ok": degree_ok,
            },
            "skills": {
                "score": skills_score,
                "max": WEIGHTS["skills"],
                "matched": matched,
                "missing": missing,
            },
            "logistics": {
                "score": logistics_score,
                "max": WEIGHTS["logistics"],
                "required_languages": langs_needed,
                "missing_languages": missing_langs,
                "clearance_phrase": clearance,
            },
        },
    }
