"""Append-only local record of every Nemotron call Sage makes.

Independent of the Nebius dashboard: a verifiable, timestamped log of the
model, tier, latency, token usage and upstream request id for each call.
Never stores credentials.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

LEDGER_PATH = Path(__file__).resolve().parents[2] / "usage_ledger.jsonl"
_lock = threading.Lock()


def record(entry: Dict[str, Any]) -> None:
    """Append one call record. Bookkeeping must never break a reply."""
    row = {"ts": datetime.now(timezone.utc).isoformat(), **entry}
    try:
        with _lock:
            with LEDGER_PATH.open("a", encoding="utf-8") as f:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
    except Exception as e:  # noqa: BLE001
        logger.warning("usage ledger write failed: %s", e)


def _read_rows() -> List[Dict[str, Any]]:
    if not LEDGER_PATH.exists():
        return []
    rows: List[Dict[str, Any]] = []
    try:
        with LEDGER_PATH.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    except Exception as e:  # noqa: BLE001
        logger.warning("usage ledger read failed: %s", e)
    return rows


def summary(limit: int = 20) -> Dict[str, Any]:
    """Cumulative token usage plus the most recent calls."""
    rows = _read_rows()
    totals = {
        "calls": len(rows),
        "prompt_tokens": 0,
        "completion_tokens": 0,
        "reasoning_tokens": 0,
        "total_tokens": 0,
    }
    by_model: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        p = r.get("prompt_tokens") or 0
        c = r.get("completion_tokens") or 0
        rs = r.get("reasoning_tokens") or 0
        totals["prompt_tokens"] += p
        totals["completion_tokens"] += c
        totals["reasoning_tokens"] += rs
        totals["total_tokens"] += p + c + rs
        m = by_model.setdefault(
            r.get("model", "?"),
            {"calls": 0, "prompt_tokens": 0, "completion_tokens": 0, "reasoning_tokens": 0},
        )
        m["calls"] += 1
        m["prompt_tokens"] += p
        m["completion_tokens"] += c
        m["reasoning_tokens"] += rs
    return {
        "ledger_path": str(LEDGER_PATH),
        "totals": totals,
        "by_model": by_model,
        "recent": rows[-limit:][::-1],
    }
