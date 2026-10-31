"""Regenerates fixtures/ats_cases.json from fixtures/ats_inputs.json using the Python engine.

Both test suites (tests/test_parity.py and frontend/src/__tests__/parity.test.ts) assert against the
output, which keeps the Python server and the browser port scoring identically.

    python fixtures/generate.py
"""

import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from jobsdirect.ats import evaluate_fit  # noqa: E402


def main() -> None:
    spec = json.loads((ROOT / "fixtures" / "ats_inputs.json").read_text(encoding="utf-8"))
    today = date.fromisoformat(spec["today"])
    out = []
    for case in spec["cases"]:
        result = evaluate_fit(
            case["candidate"], case["job"], case["languages"], case["work_authorized"], today
        )
        out.append({**case, "expected": result})
    (ROOT / "fixtures" / "ats_cases.json").write_text(
        json.dumps({"today": spec["today"], "cases": out}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {len(out)} cases")


if __name__ == "__main__":
    main()
