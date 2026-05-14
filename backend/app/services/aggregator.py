"""
Aggregator service.

Owns the periodic refresh loop:
    sources -> derived signals -> normalization -> interaction
            -> intelligence -> detection -> AI narrative
and broadcasts snapshots over the in-process pubsub.
"""
from __future__ import annotations

import asyncio
import logging
import time
from collections import deque
from dataclasses import asdict
from typing import Any, Deque, Dict, List, Set

from ..config import settings
from ..engine import detection as det_engine
from ..engine import interaction as inter_engine
from ..engine import intelligence as intel_engine
from ..engine.ai_interpreter import narrate
from ..engine.normalization import RollingNormalizer
from ..sources.binance import BinanceClient
from ..sources.derived import derive

log = logging.getLogger(__name__)


class Aggregator:
    def __init__(self) -> None:
        self.binance = BinanceClient()
        self.normalizer = RollingNormalizer(max_size=settings.history_size)
        self.snapshots: Dict[str, Dict[str, Any]] = {}
        self.feeds: Dict[str, Deque[Dict[str, Any]]] = {
            "whale": deque(maxlen=120),
            "liquidation": deque(maxlen=120),
            "funding": deque(maxlen=120),
            "smart_money": deque(maxlen=120),
            "exchange_flow": deque(maxlen=120),
        }
        self._subscribers: Set[asyncio.Queue] = set()
        self._task: asyncio.Task | None = None
        self._running = False

    # ----------------- lifecycle -----------------

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop(), name="aggregator-loop")
        log.info("aggregator started for symbols=%s", settings.symbols_list)

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        await self.binance.close()

    # ----------------- pubsub -----------------

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=64)
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self._subscribers.discard(q)

    async def _broadcast(self, payload: Dict[str, Any]) -> None:
        dead = []
        for q in self._subscribers:
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self._subscribers.discard(q)

    # ----------------- main loop -----------------

    async def _loop(self) -> None:
        while self._running:
            t0 = time.time()
            try:
                results = await asyncio.gather(
                    *(self._process_symbol(s) for s in settings.symbols_list),
                    return_exceptions=True,
                )
                for r in results:
                    if isinstance(r, Exception):
                        log.warning("symbol processing failed: %s", r)
                await self._broadcast({
                    "type": "snapshot",
                    "ts": int(time.time() * 1000),
                    "data": self.snapshots,
                    "feeds": {k: list(v) for k, v in self.feeds.items()},
                })
            except Exception as e:  # noqa: BLE001
                log.exception("aggregator loop error: %s", e)

            elapsed = time.time() - t0
            await asyncio.sleep(max(0.5, settings.refresh_interval - elapsed))

    # ----------------- per-symbol pipeline -----------------

    async def _process_symbol(self, symbol: str) -> None:
        raw = await self.binance.snapshot(symbol)
        sig = derive(raw)

        # Normalize each variable on its own rolling window
        n_v = self.normalizer.push(symbol, "volume", sig.volume_quote_24h)
        n_oi = self.normalizer.push(symbol, "oi", sig.open_interest)
        n_w = self.normalizer.push(symbol, "whale", sig.whale_proxy)
        n_sm = self.normalizer.push(symbol, "sm", sig.smart_money_proxy)
        n_m = self.normalizer.push(symbol, "momentum", sig.momentum_abs)
        n_r = self.normalizer.push(symbol, "vol", sig.realized_vol)
        n_n = self.normalizer.push(symbol, "noise", sig.noise)
        n_f = self.normalizer.push(symbol, "funding", abs(sig.funding_rate))
        n_l = self.normalizer.push(symbol, "liq", sig.liq_pressure)
        n_flow = self.normalizer.push(symbol, "flow", sig.flow_out_proxy)

        norm = {
            "volume": n_v.norm, "oi": n_oi.norm, "whale": n_w.norm,
            "sm": n_sm.norm, "momentum": n_m.norm, "vol": n_r.norm,
            "noise": n_n.norm, "funding": n_f.norm, "liq": n_l.norm,
            "flow": n_flow.norm,
        }

        inter = inter_engine.compute(
            v=n_v.norm, oi=n_oi.norm, w=n_w.norm, sm=n_sm.norm,
            f=n_f.norm, l=n_l.norm, flow_out=n_flow.norm,
        )

        scores = intel_engine.compute_scores(
            w=n_w.norm, sm=n_sm.norm, v=n_v.norm, oi=n_oi.norm, m=n_m.norm,
            r=n_r.norm, n=n_n.norm, f=n_f.norm, l=n_l.norm,
            flow_out=n_flow.norm, delta=sig.momentum_signed,
        )

        detection = det_engine.detect(
            v=n_v.norm, oi=n_oi.norm, w=n_w.norm, sm=n_sm.norm, m=n_m.norm,
            r=n_r.norm, n=n_n.norm, f=n_f.norm, l=n_l.norm,
            flow_out=n_flow.norm, delta=sig.momentum_signed,
            scores=scores.__dict__,
        )

        narrative = narrate(symbol, scores.__dict__, detection.__dict__, norm)

        # ---- candle list for the chart panel ----
        klines = raw.get("klines") or []
        candles: List[Dict[str, Any]] = [
            {
                "time": int(k[0] // 1000),
                "open": float(k[1]),
                "high": float(k[2]),
                "low": float(k[3]),
                "close": float(k[4]),
                "volume": float(k[5]),
            }
            for k in klines[-200:]
        ]

        snap = {
            "symbol": symbol,
            "price": sig.price,
            "raw": {
                "volume24h": sig.volume_quote_24h,
                "openInterest": sig.open_interest,
                "fundingRate": sig.funding_rate,
                "longShortRatio": sig.long_short_ratio,
                "topTraderRatio": sig.top_trader_ratio,
                "takerBuyRatio": sig.taker_buy_ratio,
                "realizedVol": sig.realized_vol,
                "momentumSigned": sig.momentum_signed,
                "oiDelta": sig.oi_delta,
            },
            "normalized": norm,
            "interaction": asdict(inter),
            "scores": scores.__dict__,
            "detection": detection.__dict__,
            "narrative": narrative,
            "candles": candles,
        }
        self.snapshots[symbol] = snap

        # ---- feed updates (BTC drives global feeds) ----
        if symbol == settings.symbols_list[0]:
            ts = int(time.time() * 1000)
            self.feeds["funding"].append({"ts": ts, "symbol": symbol,
                                          "rate": sig.funding_rate,
                                          "score": n_f.norm})
            if n_w.norm > 0.6:
                self.feeds["whale"].append({
                    "ts": ts, "symbol": symbol,
                    "intensity": round(n_w.norm, 3),
                    "direction": "INFLOW" if sig.flow_out_proxy < 0.5 else "OUTFLOW",
                })
            if n_l.norm > 0.55:
                self.feeds["liquidation"].append({
                    "ts": ts, "symbol": symbol,
                    "pressure": round(n_l.norm, 3),
                    "side": "LONGS" if sig.long_short_ratio > 1.05 else
                            "SHORTS" if sig.long_short_ratio < 0.95 else "BOTH",
                })
            if n_sm.norm > 0.6:
                self.feeds["smart_money"].append({
                    "ts": ts, "symbol": symbol,
                    "score": round(n_sm.norm, 3),
                    "bias": "LONG" if sig.top_trader_ratio > sig.long_short_ratio else "SHORT",
                })
            self.feeds["exchange_flow"].append({
                "ts": ts, "symbol": symbol,
                "flow": round(n_flow.norm, 3),
                "direction": "OUTFLOW" if sig.flow_out_proxy > 0.5 else "INFLOW",
            })


aggregator = Aggregator()
