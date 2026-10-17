"""Intelligent Nemotron model routing for Sage.

Every model here is an NVIDIA Nemotron model served through the Nebius Token
Factory API. The IDs below are verified against the live catalog
(GET https://api.tokenfactory.nebius.com/v1/models) — never invented.

Tiers
-----
* nano  — fast, cheap, everyday chat: greetings, acknowledgements, casual
          banter, and tiny/simple replies. Low latency, minimal credits.
* super — the default workhorse for Sage's four modes (focus/calm/companion/
          plan), ADHD support, task breakdown, planning and conversation.
* ultra — heavier reasoning for complex, multi-step or difficult tasks.

The router optimises for low latency and efficient credit usage: it only
escalates to Ultra for genuinely complex requests.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Optional

# --------------------------------------------------------------------------
# Verified Nebius Token Factory model IDs.
# --------------------------------------------------------------------------
NANO_MODEL = "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B"
SUPER_MODEL = "nvidia/nemotron-3-super-120b-a12b"
ULTRA_MODEL = "nvidia/Nemotron-3-Ultra-550b-a55b"

DEFAULT_MODELS: Dict[str, str] = {
    "nano": NANO_MODEL,
    "super": SUPER_MODEL,
    "ultra": ULTRA_MODEL,
}

# OpenAI-compatible Nemotron models on Nebius expose chain-of-thought through a
# separate `reasoning_content` field, or inline when thinking is enabled. For
# the fast tiers we disable thinking so replies are quick and never leak.
TIER_DEFAULTS = {
    # tier: (enable_thinking, max_tokens, temperature)
    "nano": (False, 256, 0.8),
    "super": (False, 384, 0.9),
    "ultra": (True, 1024, 0.6),
}

# Nemius-only fallback preference if the chosen model is unavailable.
FALLBACK_TIERS = ("super", "nano", "ultra")

# The four activity modes Sage supports.
FOUR_MODES = ("focus", "calm", "companion", "plan")


@dataclass(frozen=True)
class RouteDecision:
    """A concrete model choice for one request."""

    tier: str        # "nano" | "super" | "ultra"
    model: str       # exact Nebius Token Factory model id
    enable_thinking: bool
    max_tokens: int
    temperature: float
    reason: str


_SIMPLE_RE = re.compile(
    r"^\s*(hi+|hey+|hello+|heya|yo+|sup|howdy|gm|gn|"
    r"good (morning|evening|night)|"
    r"thanks?( you)?|thank you|ty|thx|tysm|appreciate (it|you)|"
    r"ok(ay)?|k|cool|nice|great|awesome|bet|sure|yep|yeah|yup|nah|nope|no+|yes+|"
    r"lol|lmao|haha+|hehe|welcome|np|nvm|idk|"
    r"bye|cya|goodnight|g2g|ttyl)[\s!.?]*$",
    re.IGNORECASE,
)

_CASUAL_RE = re.compile(
    r"\b(how are you|hru|how's it going|howzit|whats up|what's up|wassup|"
    r"wyd|what you doing|you good|you up|catch up|nothing much|nm|same|"
    r"just vibing|vibing)\b",
    re.IGNORECASE,
)

_COMPLEX_CUES = (
    "step by step", "step-by-step", "multi-step", "multistep", "break it down",
    "break this down", "plan out", "roadmap", "strategy", "strategic",
    "analyze", "analysis", "in depth", "in-depth", "why does", "why do", "why is",
    "explain in detail", "detailed", "complex", "complicated", "trade-off",
    "tradeoff", "prioritize", "prioritise", "compare", "evaluate", "debug",
    "optimize", "optimise", "root cause", "architect", "design a", "figure out",
    "long-term", "pros and cons", "weigh", "balance", "decision",
)

_TASK_CUES = (
    "plan", "task", "todo", "to-do", "project", "assignment", "deadline",
    "schedule", "organize", "organise", "steps", "study", "homework",
    "presentation", "essay", "report", "email", "apply", "clean", "move",
    "budget", "work", "finish", "start", "steps",
)


def _sentence_count(text: str) -> int:
    marks = text.count(".") + text.count("!") + text.count("?")
    return max(1, marks)


def _decide_tier(mode: str, message: str) -> tuple[str, str]:
    """Return (tier, reason) for a request. Pure heuristic, no network."""
    text = (message or "").strip()
    low = text.lower()
    words = len(low.split())
    sentences = _sentence_count(text)
    complex_hits = sum(1 for c in _COMPLEX_CUES if c in low)
    task_hits = sum(1 for c in _TASK_CUES if c in low)

    # 1. Ultra — genuinely complex, multi-step or difficult.
    if (
        complex_hits >= 2
        or (complex_hits >= 1 and words >= 10)
        or words >= 60
        or sentences >= 5
        or (mode == "plan" and complex_hits >= 1)
        or (mode == "plan" and (words >= 25 or task_hits >= 3))
        or (mode == "companion" and complex_hits >= 1)
    ):
        return "ultra", "complex reasoning"

    # 2. Nano — greetings, acknowledgements, casual chat, tiny messages.
    if text and _SIMPLE_RE.match(text) and words <= 6:
        return "nano", "greeting/ack"
    if mode not in FOUR_MODES and words <= 8 and task_hits == 0 and complex_hits == 0:
        if _CASUAL_RE.search(low) or words <= 6:
            return "nano", "casual chat"

    # 3. Super — the default for the four modes and normal conversation.
    return "super", "default"


def build_decision(tier: str, models: Optional[Dict[str, str]] = None,
                   reason: str = "default") -> RouteDecision:
    models = models or DEFAULT_MODELS
    thinking, max_tokens, temperature = TIER_DEFAULTS.get(tier, TIER_DEFAULTS["super"])
    return RouteDecision(
        tier=tier,
        model=models.get(tier, models.get("super", SUPER_MODEL)),
        enable_thinking=thinking,
        max_tokens=max_tokens,
        temperature=temperature,
        reason=reason,
    )


def select_model(
    mode: str,
    message: str,
    history: Optional[List[dict]] = None,
    models: Optional[Dict[str, str]] = None,
) -> RouteDecision:
    """Pick the tier for a request, optimising for latency + credit usage."""
    tier, reason = _decide_tier(mode, message)
    return build_decision(tier, models, reason)


def fallback_decisions(
    primary: RouteDecision,
    models: Optional[Dict[str, str]] = None,
) -> List[RouteDecision]:
    """Nebius-Nemotron-only fallbacks, tried in cheap-and-safe order."""
    out: List[RouteDecision] = []
    for tier in FALLBACK_TIERS:
        decision = build_decision(tier, models, reason="fallback")
        if decision.model != primary.model:
            out.append(decision)
    return out
