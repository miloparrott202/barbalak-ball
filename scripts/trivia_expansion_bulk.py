"""Load 800 pre-generated expansion questions from JSON (see gen_expansion.py)."""
from __future__ import annotations

import json
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
_JSON = _ROOT / "content" / "trivia_expansion_bulk.json"


def expansion_800() -> list[dict]:
    data = json.loads(_JSON.read_text(encoding="utf-8"))
    if len(data) != 800:
        raise ValueError(f"Expected 800 expansion questions, got {len(data)}")
    return data
