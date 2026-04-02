#!/usr/bin/env python3
"""Merge trivia.json: replace alcohol entries, append 800 new questions (total 1000)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

TRIVIA_PATH = ROOT / "content" / "trivia.json"

# --- Alcohol / drinking themed IDs to replace (same difficulty + theme) ---
REPLACEMENTS: dict[str, dict] = {}

def _q(
    qid: str,
    diff: str,
    question: str,
    options: list[str],
    answer: int,
) -> dict:
    return {
        "id": qid,
        "difficulty": diff,
        "question": question,
        "options": options,
        "answer": answer,
    }


REPLACEMENTS["ta-e2"] = _q(
    "ta-e2",
    "easy",
    "At what age can Americans vote in federal elections?",
    ["16", "17", "18", "21"],
    2,
)
REPLACEMENTS["ta-e4"] = _q(
    "ta-e4",
    "easy",
    "What does NASA stand for?",
    [
        "National Aeronautics and Space Administration",
        "North American Space Agency",
        "National Air and Space Association",
        "Naval Aeronautics and Space Administration",
    ],
    0,
)
REPLACEMENTS["ta-e8"] = _q(
    "ta-e8",
    "easy",
    "Which company makes the iPhone?",
    ["Samsung", "Google", "Apple", "Microsoft"],
    2,
)
REPLACEMENTS["ta-e9"] = _q(
    "ta-e9",
    "easy",
    "In baseball, how many strikes make an out?",
    ["2", "3", "4", "5"],
    1,
)
REPLACEMENTS["ta-e11"] = _q(
    "ta-e11",
    "easy",
    "What animal is the mascot of the World Wildlife Fund logo?",
    ["Tiger", "Elephant", "Giant panda", "Polar bear"],
    2,
)
REPLACEMENTS["ta-e13"] = _q(
    "ta-e13",
    "easy",
    "How many innings are in a standard MLB game (not counting extras)?",
    ["7", "8", "9", "10"],
    2,
)
REPLACEMENTS["ta-m7"] = _q(
    "ta-m7",
    "medium",
    "Roughly how many people live in the United States (millions, 2020s)?",
    ["~210", "~270", "~330", "~410"],
    2,
)
REPLACEMENTS["ta-m10"] = _q(
    "ta-m10",
    "medium",
    "What is the highest court in the United States?",
    [
        "Court of Appeals",
        "Supreme Court",
        "District Court",
        "Federal Circuit",
    ],
    1,
)
REPLACEMENTS["ta-m12"] = _q(
    "ta-m12",
    "medium",
    "Which carmaker uses the slogan 'The Ultimate Driving Machine'?",
    ["Mercedes-Benz", "BMW", "Audi", "Porsche"],
    1,
)
REPLACEMENTS["ta-h5"] = _q(
    "ta-h5",
    "hard",
    "What was the Manhattan Project primarily known for developing?",
    [
        "The jet engine",
        "The atomic bomb",
        "Radar",
        "Penicillin",
    ],
    1,
)
REPLACEMENTS["ta-h11"] = _q(
    "ta-h11",
    "hard",
    "Roughly what share of U.S. land is owned by the federal government?",
    ["~5%", "~14%", "~28%", "~45%"],
    2,
)
REPLACEMENTS["ta-h12"] = _q(
    "ta-h12",
    "hard",
    "Which U.S. city is nicknamed 'The City of Brotherly Love'?",
    ["Boston", "Philadelphia", "Baltimore", "Charleston"],
    1,
)
REPLACEMENTS["ta-h15"] = _q(
    "ta-h15",
    "hard",
    "What is the standard U.S. railroad track gauge between the inner rails (inches)?",
    ["56.5", "48", "60", "50"],
    0,
)
REPLACEMENTS["ta-r2"] = _q(
    "ta-r2",
    "ruinous",
    "About how many miles long is the Mississippi River?",
    ["~1,200", "~2,350", "~3,700", "~4,900"],
    1,
)
REPLACEMENTS["tw-m11"] = _q(
    "tw-m11",
    "medium",
    "Which country hosted the 2016 Summer Olympics?",
    ["China", "Brazil", "United Kingdom", "Russia"],
    1,
)


def main() -> None:
    data: list[dict] = json.loads(TRIVIA_PATH.read_text(encoding="utf-8"))
    by_id = {q["id"]: i for i, q in enumerate(data)}

    for qid, repl in REPLACEMENTS.items():
        if qid not in by_id:
            raise SystemExit(f"Missing id {qid}")
        data[by_id[qid]] = repl

    # Remove Beer die from ta-e5 options (replace question/options to drop alcohol reference)
    idx = by_id.get("ta-e5")
    if idx is not None:
        data[idx] = _q(
            "ta-e5",
            "easy",
            "Which game is played by tossing bean bags onto boards with a hole?",
            ["Horseshoes", "Bocce", "Cornhole", "Croquet"],
            2,
        )

    from trivia_expansion_bulk import expansion_800  # type: ignore

    data.extend(expansion_800())

    if len(data) != 1000:
        raise SystemExit(f"Expected 1000 questions, got {len(data)}")

    # Validate ids unique
    ids = [q["id"] for q in data]
    if len(ids) != len(set(ids)):
        dup = [x for x in ids if ids.count(x) > 1]
        raise SystemExit(f"Duplicate ids: {set(dup)}")

    TRIVIA_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("Wrote", len(data), "questions to", TRIVIA_PATH)


if __name__ == "__main__":
    main()
