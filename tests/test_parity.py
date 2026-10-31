"""Guards the shared fixture that the TypeScript port is tested against."""

import json
from datetime import date
from pathlib import Path

import pytest

from jobsdirect.ats import evaluate_fit

SPEC = json.loads(
    (Path(__file__).resolve().parent.parent / "fixtures" / "ats_cases.json").read_text("utf-8")
)
TODAY = date.fromisoformat(SPEC["today"])


@pytest.mark.parametrize("case", SPEC["cases"], ids=lambda c: c["name"])
def test_fixture_matches_engine(case):
    got = evaluate_fit(
        case["candidate"], case["job"], case["languages"], case["work_authorized"], TODAY
    )
    assert got == case["expected"], "run `python fixtures/generate.py` after changing the engine"
