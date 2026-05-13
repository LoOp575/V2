"""
Interaction engine.

Builds composite signals between normalized variables.
These compositions encode the structural relationships
the intelligence engine reasons about.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class InteractionSet:
    voi: float        # Volume x Open Interest -> leverage / expansion energy
    smf: float        # Whale x Volume        -> smart money / institutional pressure
    pressure: float   # OI x Funding-overheat -> directional leverage pressure
    trap: float       # OI x Liquidation x Funding -> trap risk
    flow: float       # ExchangeOutflow x Whale -> accumulation flow energy


def compute(
    *,
    v: float,
    oi: float,
    w: float,
    sm: float,
    f: float,
    l: float,
    flow_out: float,
) -> InteractionSet:
    """All inputs expected normalized to [0,1]."""
    voi = v * oi
    smf = w * v
    pressure = oi * f
    trap = oi * l * f
    flow = flow_out * w
    return InteractionSet(voi=voi, smf=smf, pressure=pressure, trap=trap, flow=flow)
