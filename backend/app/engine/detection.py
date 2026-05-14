"""
Detection engine.

Rule-based phase classifiers that turn normalized variables
and intelligence scores into discrete market regimes.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class Detection:
    phase: str                       # ACCUMULATION | DISTRIBUTION | TRAP | EXPANSION | NEUTRAL
    confidence: float                # [0,1]
    flags: List[str] = field(default_factory=list)
    regime: str = "RANGE"            # TREND_UP | TREND_DOWN | RANGE | VOLATILE


def detect(*,
           v: float, oi: float, w: float, sm: float, m: float,
           r: float, n: float, f: float, l: float,
           flow_out: float, delta: float,
           scores: Dict[str, float]) -> Detection:
    """
    All scalar inputs in [0,1] except `delta` in [-1,1].
    `scores` is a dict of intelligence scores already clipped to [0,1].
    """
    flags: List[str] = []

    # ---- candidate scores per phase ----
    accumulation = (
        0.30 * (1 - abs(delta))   # price flat
        + 0.20 * v                 # volume rising
        + 0.20 * oi                # OI rising
        + 0.20 * flow_out          # outflow positive
        + 0.10 * w                 # whale inflow
    )

    distribution = (
        0.30 * max(delta, 0)       # price rising
        + 0.25 * f                 # funding overheated
        + 0.20 * (1 - flow_out)    # outflow turning to inflow
        + 0.15 * n                 # retail noise spikes
        + 0.10 * (1 - w)           # whale outflow
    )

    trap = (
        0.35 * oi
        + 0.30 * f
        + 0.20 * l
        + 0.15 * (1 - v)           # weak spot demand
    )

    expansion = (
        0.35 * (v * oi)
        + 0.25 * scores.get("momentum_strength", m)
        + 0.20 * sm
        + 0.20 * (1 - r)           # compression breaking
    )

    candidates = {
        "ACCUMULATION": accumulation,
        "DISTRIBUTION": distribution,
        "TRAP": trap,
        "EXPANSION": expansion,
    }
    phase, conf = max(candidates.items(), key=lambda kv: kv[1])

    # Threshold guard: nothing strong enough -> NEUTRAL
    if conf < 0.45:
        phase = "NEUTRAL"

    # ---- regime tag ----
    if r > 0.7:
        regime = "VOLATILE"
    elif delta > 0.25:
        regime = "TREND_UP"
    elif delta < -0.25:
        regime = "TREND_DOWN"
    else:
        regime = "RANGE"

    # ---- flags ----
    if f > 0.75:
        flags.append("FUNDING_OVERHEATED")
    if l > 0.7:
        flags.append("LIQUIDATION_CLUSTER")
    if oi > 0.8 and v < 0.4:
        flags.append("LEVERAGE_DIVERGENCE")
    if w > 0.7 and flow_out > 0.6:
        flags.append("WHALE_ACCUMULATION")
    if n > 0.75:
        flags.append("HIGH_NOISE")
    if scores.get("squeeze_probability", 0) > 0.7:
        flags.append("SQUEEZE_RISK")
    if scores.get("expansion_probability", 0) > 0.7:
        flags.append("EXPANSION_PRIMED")

    return Detection(phase=phase, confidence=round(float(conf), 4),
                     flags=flags, regime=regime)
