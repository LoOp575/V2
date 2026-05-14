"""
Intelligence engine.

Implements the CPI master formula and the family of derived scores:

    CPI = (W * SM * V * OI * M) / ((1+R)(1+N)(1+F)(1+L))

All inputs are expected on a normalized 0..1 scale.
Outputs are clamped to [0,1] for UI consumption.
"""
from __future__ import annotations

from dataclasses import dataclass


def _clip01(x: float) -> float:
    if x != x:  # NaN
        return 0.0
    return 0.0 if x < 0 else 1.0 if x > 1 else x


@dataclass
class IntelligenceScores:
    cpi: float
    expansion_probability: float
    market_stability: float
    smart_money_confidence: float
    squeeze_probability: float
    accumulation_score: float
    manipulation_risk: float
    volatility_pressure: float
    momentum_strength: float


def compute_scores(
    *,
    w: float, sm: float, v: float, oi: float, m: float,
    r: float, n: float, f: float, l: float,
    flow_out: float, delta: float,
) -> IntelligenceScores:
    """
    Parameters (all in [0,1]):
        w  - whale activity score
        sm - smart-money cluster score
        v  - normalized volume
        oi - open-interest strength
        m  - momentum acceleration (|dP/dt|)
        r  - volatility risk
        n  - market noise
        f  - funding overheating
        l  - liquidation pressure
        flow_out - net exchange outflow strength
        delta    - signed momentum direction in [-1,1]
    """
    numerator = w * sm * v * oi * m
    denominator = (1 + r) * (1 + n) * (1 + f) * (1 + l)
    cpi_raw = numerator / denominator if denominator else 0.0

    # CPI is naturally in [0, 1] when all inputs are in [0,1] but the
    # denominator can shrink it sharply; we keep raw and clip.
    cpi = _clip01(cpi_raw)

    expansion_probability = _clip01(
        0.45 * (v * oi) + 0.25 * m + 0.15 * sm + 0.15 * w - 0.35 * r
    )
    market_stability = _clip01(1 - (0.5 * r + 0.3 * n + 0.2 * f))
    smart_money_confidence = _clip01(0.55 * sm + 0.25 * w + 0.20 * flow_out)
    squeeze_probability = _clip01(0.45 * f + 0.35 * l + 0.20 * oi - 0.20 * v)
    accumulation_score = _clip01(
        0.35 * flow_out + 0.25 * w + 0.20 * v + 0.20 * (1 - r) - 0.15 * abs(delta)
    )
    manipulation_risk = _clip01(0.45 * n + 0.30 * f + 0.25 * l - 0.20 * sm)
    volatility_pressure = _clip01(0.6 * r + 0.4 * n)
    momentum_strength = _clip01(m)

    return IntelligenceScores(
        cpi=cpi,
        expansion_probability=expansion_probability,
        market_stability=market_stability,
        smart_money_confidence=smart_money_confidence,
        squeeze_probability=squeeze_probability,
        accumulation_score=accumulation_score,
        manipulation_risk=manipulation_risk,
        volatility_pressure=volatility_pressure,
        momentum_strength=momentum_strength,
    )
