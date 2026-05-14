"""
Normalization engine.

Maintains rolling windows per (symbol, variable) and produces
0..1 min-max normalized values, plus z-scores and percentile ranks.

These are the building blocks consumed by the interaction and
intelligence engines downstream.
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Deque, Dict, Tuple

import numpy as np


@dataclass
class NormalizedView:
    """One variable, fully described."""
    raw: float
    norm: float          # min-max in [0,1]
    z: float             # z-score on the rolling window
    pct: float           # percentile rank in [0,1]


class RollingNormalizer:
    """Rolling-window normalizer keyed by (symbol, variable)."""

    def __init__(self, max_size: int = 720) -> None:
        self.max_size = max_size
        self._windows: Dict[Tuple[str, str], Deque[float]] = {}

    def push(self, symbol: str, variable: str, value: float) -> NormalizedView:
        if value is None or not np.isfinite(value):
            value = 0.0
        key = (symbol, variable)
        win = self._windows.setdefault(key, deque(maxlen=self.max_size))
        win.append(float(value))

        arr = np.fromiter(win, dtype=float)
        lo, hi = float(arr.min()), float(arr.max())
        rng = hi - lo
        norm = 0.5 if rng == 0 else (value - lo) / rng

        mu = float(arr.mean())
        sd = float(arr.std()) or 1e-9
        z = (value - mu) / sd

        pct = float((arr <= value).mean())

        return NormalizedView(raw=value, norm=float(norm), z=float(z), pct=pct)

    def get_window(self, symbol: str, variable: str) -> np.ndarray:
        key = (symbol, variable)
        win = self._windows.get(key)
        return np.fromiter(win, dtype=float) if win else np.array([])
