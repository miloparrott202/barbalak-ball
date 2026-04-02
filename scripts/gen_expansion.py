#!/usr/bin/env python3
"""Generate content/trivia_expansion_bulk.json (800 questions). Run from repo root."""
from __future__ import annotations

import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content" / "trivia_expansion_bulk.json"

random.seed(2026)


def q(
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


def shuffle_opts(correct: str, pool: list[str], rng: random.Random) -> tuple[list[str], int]:
    wrong = [x for x in pool if x != correct]
    pick = rng.sample(wrong, 3)
    opts = [correct] + pick
    rng.shuffle(opts)
    return opts, opts.index(correct)


US_STATES = [
    ("Alabama", "Montgomery"),
    ("Alaska", "Juneau"),
    ("Arizona", "Phoenix"),
    ("Arkansas", "Little Rock"),
    ("California", "Sacramento"),
    ("Colorado", "Denver"),
    ("Connecticut", "Hartford"),
    ("Delaware", "Dover"),
    ("Florida", "Tallahassee"),
    ("Georgia", "Atlanta"),
    ("Hawaii", "Honolulu"),
    ("Idaho", "Boise"),
    ("Illinois", "Springfield"),
    ("Indiana", "Indianapolis"),
    ("Iowa", "Des Moines"),
    ("Kansas", "Topeka"),
    ("Kentucky", "Frankfort"),
    ("Louisiana", "Baton Rouge"),
    ("Maine", "Augusta"),
    ("Maryland", "Annapolis"),
    ("Massachusetts", "Boston"),
    ("Michigan", "Lansing"),
    ("Minnesota", "Saint Paul"),
    ("Mississippi", "Jackson"),
    ("Missouri", "Jefferson City"),
    ("Montana", "Helena"),
    ("Nebraska", "Lincoln"),
    ("Nevada", "Carson City"),
    ("New Hampshire", "Concord"),
    ("New Jersey", "Trenton"),
    ("New Mexico", "Santa Fe"),
    ("New York", "Albany"),
    ("North Carolina", "Raleigh"),
    ("North Dakota", "Bismarck"),
    ("Ohio", "Columbus"),
    ("Oklahoma", "Oklahoma City"),
    ("Oregon", "Salem"),
    ("Pennsylvania", "Harrisburg"),
    ("Rhode Island", "Providence"),
    ("South Carolina", "Columbia"),
    ("South Dakota", "Pierre"),
    ("Tennessee", "Nashville"),
    ("Texas", "Austin"),
    ("Utah", "Salt Lake City"),
    ("Vermont", "Montpelier"),
    ("Virginia", "Richmond"),
    ("Washington", "Olympia"),
    ("West Virginia", "Charleston"),
    ("Wisconsin", "Madison"),
    ("Wyoming", "Cheyenne"),
]

WORLD = [
    ("United Kingdom", "London"),
    ("Japan", "Tokyo"),
    ("Germany", "Berlin"),
    ("Italy", "Rome"),
    ("Spain", "Madrid"),
    ("Thailand", "Bangkok"),
    ("Argentina", "Buenos Aires"),
    ("Egypt", "Cairo"),
    ("South Korea", "Seoul"),
    ("Vietnam", "Hanoi"),
    ("Poland", "Warsaw"),
    ("Sweden", "Stockholm"),
    ("Norway", "Oslo"),
    ("Denmark", "Copenhagen"),
    ("Finland", "Helsinki"),
    ("Greece", "Athens"),
    ("Portugal", "Lisbon"),
    ("Netherlands", "Amsterdam"),
    ("Belgium", "Brussels"),
    ("Switzerland", "Bern"),
    ("Austria", "Vienna"),
    ("Ireland", "Dublin"),
    ("Czech Republic", "Prague"),
    ("Hungary", "Budapest"),
    ("Romania", "Bucharest"),
    ("Turkey", "Ankara"),
    ("Saudi Arabia", "Riyadh"),
    ("Israel", "Jerusalem"),
    ("United Arab Emirates", "Abu Dhabi"),
    ("South Africa", "Pretoria"),
    ("Kenya", "Nairobi"),
    ("Nigeria", "Abuja"),
    ("Morocco", "Rabat"),
    ("Chile", "Santiago"),
    ("Colombia", "Bogotá"),
    ("Peru", "Lima"),
    ("Venezuela", "Caracas"),
    ("Cuba", "Havana"),
    ("New Zealand", "Wellington"),
    ("Pakistan", "Islamabad"),
    ("Bangladesh", "Dhaka"),
    ("Sri Lanka", "Colombo"),
    ("Nepal", "Kathmandu"),
    ("Myanmar", "Naypyidaw"),
    ("Malaysia", "Kuala Lumpur"),
    ("Singapore", "Singapore"),
    ("Philippines", "Manila"),
    ("Indonesia", "Jakarta"),
    ("Ukraine", "Kyiv"),
    ("Croatia", "Zagreb"),
]


def pack(
    theme: str,
    letter: str,
    start: int,
    diff: str,
    rows: list[tuple[str, list[str], int]],
) -> list[dict]:
    out: list[dict] = []
    for i, (question, opts, ans) in enumerate(rows):
        out.append(q(f"{theme}-{letter}{start + i}", diff, question, opts, ans))
    return out


def us_capitals(theme: str, start_idx: int) -> list[dict]:
    rng = random.Random(42)
    caps = [c for _, c in US_STATES]
    out: list[dict] = []
    for i, (st, cap) in enumerate(US_STATES):
        opts, ans = shuffle_opts(cap, caps, rng)
        out.append(
            q(
                f"{theme}-e{start_idx + i}",
                "easy",
                f"What is the capital of {st}?",
                opts,
                ans,
            )
        )
    return out


def world_capitals(theme: str, start_idx: int) -> list[dict]:
    rng = random.Random(43)
    caps = [c for _, c in WORLD]
    out: list[dict] = []
    for i, (country, cap) in enumerate(WORLD):
        opts, ans = shuffle_opts(cap, caps, rng)
        out.append(
            q(
                f"{theme}-e{start_idx + i}",
                "easy",
                f"What is the capital of {country}?",
                opts,
                ans,
            )
        )
    return out


def build() -> list[dict]:
    from trivia_gen_data import (
        TA_EASY_EXTRA,
        TA_HARD,
        TA_MED,
        TA_RUIN,
        TE_EASY,
        TE_HARD,
        TE_MED,
        TE_RUIN,
        TG_EASY,
        TG_HARD,
        TG_MED,
        TG_RUIN,
        TW_EASY_EXTRA,
        TW_HARD,
        TW_MED,
        TW_RUIN,
    )

    out: list[dict] = []
    out.extend(pack("te", "e", 16, "easy", TE_EASY))
    out.extend(pack("te", "m", 16, "medium", TE_MED))
    out.extend(pack("te", "h", 16, "hard", TE_HARD))
    out.extend(pack("te", "r", 6, "ruinous", TE_RUIN))

    out.extend(us_capitals("ta", 16))
    out.extend(pack("ta", "e", 66, "easy", TA_EASY_EXTRA))
    out.extend(pack("ta", "m", 16, "medium", TA_MED))
    out.extend(pack("ta", "h", 16, "hard", TA_HARD))
    out.extend(pack("ta", "r", 6, "ruinous", TA_RUIN))

    out.extend(world_capitals("tw", 16))
    out.extend(pack("tw", "e", 66, "easy", TW_EASY_EXTRA))
    out.extend(pack("tw", "m", 16, "medium", TW_MED))
    out.extend(pack("tw", "h", 16, "hard", TW_HARD))
    out.extend(pack("tw", "r", 6, "ruinous", TW_RUIN))

    out.extend(pack("tg", "e", 16, "easy", TG_EASY))
    out.extend(pack("tg", "m", 16, "medium", TG_MED))
    out.extend(pack("tg", "h", 16, "hard", TG_HARD))
    out.extend(pack("tg", "r", 6, "ruinous", TG_RUIN))

    if len(out) != 800:
        raise RuntimeError(f"expected 800 expansion questions, got {len(out)}")
    return out


if __name__ == "__main__":
    data = build()
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Wrote", len(data), "questions to", OUT)
