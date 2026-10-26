from datetime import date

import pytest

from jobsdirect.salary import benchmark, match_market, match_role
from jobsdirect.tracker import Tracker, TrackerError


def test_tracker_add_list_update(tmp_path):
    t = Tracker(tmp_path / "apps.csv")
    assert t.list() == []
    t.add("123", "Acme", "Engineer", "linkedin", today=date(2026, 10, 1))
    t.add("", "Beta", "PM", notes="call Friday, 10am")
    assert [r["company"] for r in t.list()] == ["Acme", "Beta"]
    t.update(job_id="123", status="Interviewing")
    t.update(company="beta", role="pm", notes="sent, thanks")
    rows = t.list()
    assert rows[0]["status"] == "interviewing" and rows[0]["date"] == "2026-10-01"
    assert rows[1]["notes"] == "sent, thanks"


def test_tracker_rejects_bad_input(tmp_path):
    t = Tracker(tmp_path / "apps.csv")
    with pytest.raises(TrackerError):
        t.add("1", "A", "B", status="ghosted")
    with pytest.raises(TrackerError):
        t.add("", "", "")
    t.add("1", "A", "B")
    with pytest.raises(TrackerError):
        t.add("1", "A", "B")
    with pytest.raises(TrackerError):
        t.update(job_id="nope", status="offer")


def test_salary_matching():
    assert match_role("Senior Backend Developer") == "software engineer"
    assert match_role("Scrum Master") == "project manager"
    assert match_role("Chef") is None
    assert match_market("Istanbul, Türkiye") == "TR"
    assert match_market("us") == "US"
    assert match_market("Helsinki") == "EU"
    assert match_market(None) == "REMOTE"
    assert match_market("Austin") == "REMOTE"
    result = benchmark("Data Scientist", "London")
    assert result["currency"] == "GBP" and result["annual_gross"]["mid"] == "52k-78k GBP"
    assert benchmark("Chef")["matched_role"] is None
