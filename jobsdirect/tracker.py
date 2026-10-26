"""Application tracker kept as a CSV file the user can open in Excel or Numbers."""

from __future__ import annotations

import csv
from datetime import date
from pathlib import Path
from typing import Optional

FIELDS = ["date", "job_id", "company", "role", "portal", "status", "salary", "notes"]
STATUSES = ["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"]


class TrackerError(ValueError):
    pass


class Tracker:
    def __init__(self, path: Path):
        self.path = path

    def list(self) -> list[dict[str, str]]:
        if not self.path.exists():
            return []
        with self.path.open(newline="", encoding="utf-8") as f:
            return [{k: row.get(k) or "" for k in FIELDS} for row in csv.DictReader(f)]

    def _write(self, rows: list[dict[str, str]]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        with tmp.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDS)
            writer.writeheader()
            writer.writerows(rows)
        tmp.replace(self.path)

    def add(self, job_id: str, company: str, role: str, portal: str = "", status: str = "applied",
            salary: str = "", notes: str = "", today: Optional[date] = None) -> dict[str, str]:
        status = _check_status(status)
        if not (job_id or (company and role)):
            raise TrackerError("Give a job_id, or both company and role.")
        rows = self.list()
        key = job_id or f"{company}|{role}".lower()
        if any(_key(r) == key for r in rows):
            raise TrackerError(f"Already tracked: {company or job_id} {role}".strip())
        row = {"date": (today or date.today()).isoformat(), "job_id": job_id, "company": company,
               "role": role, "portal": portal, "status": status, "salary": salary, "notes": notes}
        rows.append(row)
        self._write(rows)
        return row

    def update(self, job_id: str = "", company: str = "", role: str = "", status: Optional[str] = None,
               notes: Optional[str] = None) -> dict[str, str]:
        rows = self.list()
        key = job_id or f"{company}|{role}".lower()
        for row in rows:
            if _key(row) == key:
                if status is not None:
                    row["status"] = _check_status(status)
                if notes is not None:
                    row["notes"] = notes
                self._write(rows)
                return row
        raise TrackerError("No tracked application matches that job_id / company + role.")


def _key(row: dict[str, str]) -> str:
    return row["job_id"] or f"{row['company']}|{row['role']}".lower()


def _check_status(status: str) -> str:
    status = status.strip().lower()
    if status not in STATUSES:
        raise TrackerError(f"Unknown status '{status}'. Use one of: {', '.join(STATUSES)}.")
    return status
