"""
AI market interpretation engine.

Generates institutional-style narratives from the structured
output of the intelligence + detection engines. Template-driven
and deterministic so the terminal stays auditable. Plug an LLM
in by replacing `narrate()`.
"""
from __future__ import annotations

from typing import Dict, List


def _band(x: float, lo: float = 0.33, hi: float = 0.66) -> str:
    if x < lo:
        return "low"
    if x < hi:
        return "moderate"
    return "elevated"


def narrate(symbol: str, scores: Dict[str, float],
            detection: Dict[str, object],
            normalized: Dict[str, float]) -> str:
    phase = str(detection.get("phase", "NEUTRAL"))
    regime = str(detection.get("regime", "RANGE"))
    flags: List[str] = list(detection.get("flags", []))  # type: ignore[arg-type]

    cpi = float(scores.get("cpi", 0))
    exp = float(scores.get("expansion_probability", 0))
    stab = float(scores.get("market_stability", 0))
    smc = float(scores.get("smart_money_confidence", 0))
    sq = float(scores.get("squeeze_probability", 0))
    acc = float(scores.get("accumulation_score", 0))
    manip = float(scores.get("manipulation_risk", 0))
    vol = float(scores.get("volatility_pressure", 0))

    funding = float(normalized.get("funding", 0))
    oi = float(normalized.get("oi", 0))
    whale = float(normalized.get("whale", 0))

    lines: List[str] = []
    lines.append(
        f"{symbol}: regime {regime}, phase {phase}. "
        f"CPI {cpi:.2f}, expansion {exp:.2f}, stability {stab:.2f}."
    )

    if phase == "ACCUMULATION":
        lines.append(
            f"Volume and open-interest interaction rising on a {_band(vol)} "
            f"volatility backdrop; smart-money confidence {smc:.2f} suggests "
            f"structured demand absorption."
        )
    elif phase == "DISTRIBUTION":
        lines.append(
            f"Price advance with funding {funding:.2f} and elevated participation; "
            f"whale activity {whale:.2f} consistent with profit redistribution."
        )
    elif phase == "TRAP":
        lines.append(
            f"Open-interest at {oi:.2f} stretched against weaker spot demand. "
            f"Squeeze probability {sq:.2f}; leverage trap conditions present."
        )
    elif phase == "EXPANSION":
        lines.append(
            f"Compression breaking with positive interaction energy (VOI). "
            f"Momentum acceleration constructive, expansion probability {exp:.2f}."
        )
    else:
        lines.append(
            f"No dominant phase. Accumulation {acc:.2f}, manipulation risk {manip:.2f}; "
            f"stand-by until interaction strength resolves."
        )

    if flags:
        lines.append("Flags: " + ", ".join(flags) + ".")

    return " ".join(lines)
