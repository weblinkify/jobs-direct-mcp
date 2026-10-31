"""Indicative annual salary bands (gross, thousands) for negotiation prep.

These are rough planning numbers compiled from public salary surveys, not live market data.
"""

from __future__ import annotations

from typing import Any

# role -> market -> (junior, mid, senior) as (low, high) in thousands of the market currency
BANDS: dict[str, dict[str, tuple[tuple[int, int], tuple[int, int], tuple[int, int]]]] = {
    "software engineer": {
        "US": ((85, 115), (120, 165), (170, 240)),
        "EU": ((40, 55), (55, 80), (80, 115)),
        "UK": ((35, 50), (50, 75), (75, 110)),
        "TR": ((600, 900), (900, 1500), (1500, 2400)),
        "REMOTE": ((50, 75), (75, 120), (120, 180)),
    },
    "data scientist": {
        "US": ((90, 120), (125, 165), (170, 230)),
        "EU": ((42, 58), (58, 85), (85, 120)),
        "UK": ((38, 52), (52, 78), (78, 115)),
        "TR": ((650, 950), (950, 1600), (1600, 2500)),
        "REMOTE": ((55, 80), (80, 125), (125, 185)),
    },
    "product manager": {
        "US": ((90, 120), (125, 170), (175, 250)),
        "EU": ((45, 60), (60, 90), (90, 130)),
        "UK": ((40, 55), (55, 85), (85, 125)),
        "TR": ((650, 950), (950, 1600), (1600, 2600)),
        "REMOTE": ((55, 80), (80, 130), (130, 190)),
    },
    "project manager": {
        "US": ((70, 95), (95, 130), (130, 175)),
        "EU": ((40, 52), (52, 72), (72, 100)),
        "UK": ((35, 48), (48, 68), (68, 95)),
        "TR": ((500, 800), (800, 1300), (1300, 2000)),
        "REMOTE": ((45, 65), (65, 100), (100, 145)),
    },
    "operations manager": {
        "US": ((65, 85), (85, 120), (120, 165)),
        "EU": ((38, 50), (50, 70), (70, 98)),
        "UK": ((33, 45), (45, 65), (65, 90)),
        "TR": ((480, 750), (750, 1200), (1200, 1900)),
        "REMOTE": ((42, 60), (60, 95), (95, 140)),
    },
    "designer": {
        "US": ((65, 90), (90, 125), (125, 170)),
        "EU": ((35, 48), (48, 68), (68, 95)),
        "UK": ((30, 42), (42, 62), (62, 88)),
        "TR": ((420, 700), (700, 1150), (1150, 1800)),
        "REMOTE": ((40, 60), (60, 95), (95, 135)),
    },
}

CURRENCY = {"US": "USD", "EU": "EUR", "UK": "GBP", "TR": "TRY", "REMOTE": "USD"}

_ROLE_ALIASES = {
    "developer": "software engineer",
    "engineer": "software engineer",
    "frontend": "software engineer",
    "backend": "software engineer",
    "full stack": "software engineer",
    "fullstack": "software engineer",
    "data analyst": "data scientist",
    "machine learning": "data scientist",
    "ml engineer": "data scientist",
    "product owner": "product manager",
    "program manager": "project manager",
    "scrum master": "project manager",
    "operations": "operations manager",
    "ux": "designer",
    "ui": "designer",
}
_MARKET_ALIASES = {
    "usa": "US",
    "united states": "US",
    "us": "US",
    "america": "US",
    "uk": "UK",
    "united kingdom": "UK",
    "london": "UK",
    "england": "UK",
    "turkey": "TR",
    "türkiye": "TR",
    "turkiye": "TR",
    "istanbul": "TR",
    "tr": "TR",
    "remote": "REMOTE",
    "global": "REMOTE",
    "europe": "EU",
    "eu": "EU",
    "germany": "EU",
    "finland": "EU",
    "netherlands": "EU",
    "france": "EU",
    "spain": "EU",
    "sweden": "EU",
    "berlin": "EU",
    "helsinki": "EU",
    "amsterdam": "EU",
}


def match_role(role: str) -> str | None:
    lower = role.lower()
    for key in BANDS:
        if key in lower:
            return key
    for alias, key in _ROLE_ALIASES.items():
        if alias in lower:
            return key
    return None


def match_market(location: str | None) -> str:
    if not location:
        return "REMOTE"
    lower = location.lower().strip()
    if lower in _MARKET_ALIASES:
        return _MARKET_ALIASES[lower]
    for alias, key in _MARKET_ALIASES.items():
        if len(alias) > 2 and alias in lower:
            return key
    return "REMOTE"


def benchmark(role: str, location: str | None = None) -> dict[str, Any]:
    key = match_role(role)
    market = match_market(location)
    if key is None:
        return {
            "role": role,
            "matched_role": None,
            "message": f"No band for '{role}'. Known roles: {', '.join(BANDS)}.",
        }
    junior, mid, senior = BANDS[key][market]
    unit = CURRENCY[market]

    def fmt(band: tuple[int, int]) -> str:
        return f"{band[0]:,}k-{band[1]:,}k {unit}"

    return {
        "role": role,
        "matched_role": key,
        "market": market,
        "currency": unit,
        "annual_gross": {"junior": fmt(junior), "mid": fmt(mid), "senior": fmt(senior)},
        "note": "Indicative planning bands, not live market data. Anchor on the upper half of your level.",
    }
