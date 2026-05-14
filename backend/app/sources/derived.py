"""
Derived signals layer.

Real on-chain whale data needs paid providers (Arkham, Nansen,
Whale Alert). Until those keys are wired, we derive proxies for:

    * whale activity (W)
    * smart-money cluster (SM)
    * exchange outflow (flow_out)
    * orderbook / delta pressure
    * market noise (N)
    * liquidation pressure (L)

from the Binance futures snapshot. These are mathematically
defensible approximations, not invented numbers - see comments.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

import numpy as np


@dataclass
class RawSignals:
    price: float
    volume_quote_24h: float
    open_interest: float
    funding_rate: float
    long_short_ratio: float
    top_trader_ratio: float
    taker_buy_ratio: float          # taker buy / sell volume
    momentum_abs: float             # |dP/dt| over recent kline window
    momentum_signed: float          # dP/dt signed in [-1,1] approx
    realized_vol: float             # rolling stdev of log returns
    noise: float                    # high-frequency unpredictability
    oi_delta: float                 # delta vs recent OI average
    whale_proxy: float              # large-volume bar concentration
    smart_money_proxy: float        # top-trader divergence vs retail
    flow_out_proxy: float           # net taker buy as exchange-outflow proxy
    liq_pressure: float             # crowded leverage proxy


def _f(x: Any, default: float = 0.0) -> float:
    try:
        v = float(x)
        return v if v == v else default  # NaN check
    except Exception:  # noqa: BLE001
        return default


def _kline_arrays(klines: List[List[Any]]) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    if not klines:
        return (np.array([]),) * 4  # type: ignore[return-value]
    arr = np.array(klines, dtype=object)
    closes = np.array([_f(x[4]) for x in arr], dtype=float)
    highs = np.array([_f(x[2]) for x in arr], dtype=float)
    lows = np.array([_f(x[3]) for x in arr], dtype=float)
    vols = np.array([_f(x[5]) for x in arr], dtype=float)
    return closes, highs, lows, vols


def derive(snapshot: Dict[str, Any]) -> RawSignals:
    closes, highs, lows, vols = _kline_arrays(snapshot.get("klines") or [])

    # ---- price / momentum / volatility ----
    price = float(closes[-1]) if closes.size else 0.0
    if closes.size >= 5:
        rets = np.diff(np.log(np.clip(closes, 1e-12, None)))
        # signed momentum -> last 5 bar mean return scaled by stdev
        recent = rets[-5:]
        sd = float(rets.std()) or 1e-9
        momentum_signed = float(np.tanh(recent.mean() / sd))
        momentum_abs = abs(momentum_signed)
        realized_vol = float(rets.std() * np.sqrt(60))   # 1m -> per-hour
        # noise = ratio of |range|/|net move|, capped
        net = abs(closes[-1] - closes[-30]) if closes.size >= 30 else 1e-9
        path = float(np.sum(np.abs(np.diff(closes[-30:])))) if closes.size >= 30 else net
        noise = float(min(1.0, (path / max(net, 1e-9)) / 10.0))
    else:
        momentum_signed = momentum_abs = realized_vol = noise = 0.0

    # ---- volume / whales (concentration of volume in top bars) ----
    if vols.size:
        v_sorted = np.sort(vols)[::-1]
        top = v_sorted[: max(1, vols.size // 20)].sum()  # top 5%
        whale_proxy = float(top / (vols.sum() + 1e-9))
    else:
        whale_proxy = 0.0

    # ---- ticker ----
    t24 = snapshot.get("ticker24h") or {}
    volume_quote_24h = _f(t24.get("quoteVolume"))

    # ---- open interest delta ----
    oi_now = _f((snapshot.get("openInterest") or {}).get("openInterest"))
    oi_hist = snapshot.get("openInterestHist") or []
    if oi_hist:
        oi_series = np.array([_f(x.get("sumOpenInterest")) for x in oi_hist])
        avg = float(oi_series.mean()) or 1e-9
        oi_delta = float((oi_now - avg) / avg)
    else:
        oi_delta = 0.0

    # ---- funding ----
    funding_rate = _f((snapshot.get("funding") or {}).get("lastFundingRate"))

    # ---- ratios ----
    lsr_list = snapshot.get("longShortRatio") or []
    long_short_ratio = _f(lsr_list[-1].get("longShortRatio")) if lsr_list else 1.0

    top_list = snapshot.get("topTraderRatio") or []
    top_trader_ratio = _f(top_list[-1].get("longShortRatio")) if top_list else 1.0

    taker_list = snapshot.get("takerRatio") or []
    taker_buy_ratio = _f(taker_list[-1].get("buySellRatio")) if taker_list else 1.0

    # ---- composite proxies ----
    # Smart money proxy = signed divergence between top-trader and retail
    sm = float(np.tanh((top_trader_ratio - long_short_ratio)))
    smart_money_proxy = (sm + 1) / 2  # to [0,1]

    # Net taker buy as proxy of net exchange-outflow demand
    flow_out_proxy = float(np.tanh(taker_buy_ratio - 1.0))
    flow_out_proxy = (flow_out_proxy + 1) / 2

    # Liquidation pressure proxy: extreme funding * crowded retail side * OI stretch
    crowded = abs(long_short_ratio - 1.0)
    liq_pressure = float(min(1.0, (abs(funding_rate) * 200) * 0.5
                             + min(1.0, crowded) * 0.3
                             + min(1.0, abs(oi_delta) * 5) * 0.2))

    return RawSignals(
        price=price,
        volume_quote_24h=volume_quote_24h,
        open_interest=oi_now,
        funding_rate=funding_rate,
        long_short_ratio=long_short_ratio,
        top_trader_ratio=top_trader_ratio,
        taker_buy_ratio=taker_buy_ratio,
        momentum_abs=momentum_abs,
        momentum_signed=momentum_signed,
        realized_vol=realized_vol,
        noise=noise,
        oi_delta=oi_delta,
        whale_proxy=whale_proxy,
        smart_money_proxy=smart_money_proxy,
        flow_out_proxy=flow_out_proxy,
        liq_pressure=liq_pressure,
    )
