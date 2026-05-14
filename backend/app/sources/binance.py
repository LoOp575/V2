"""
Binance Futures data source.

Public, keyless endpoints. We pull only what's needed for the
intelligence engine: klines, 24h ticker, open interest,
funding, long/short ratio, recent forced liquidations (top trader stream
is paid; we approximate using long/short and OI deltas).
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

import httpx

log = logging.getLogger(__name__)

BASE_FUTURES = "https://fapi.binance.com"


class BinanceClient:
    def __init__(self, timeout: float = 8.0) -> None:
        self._client = httpx.AsyncClient(
            base_url=BASE_FUTURES,
            timeout=timeout,
            headers={"User-Agent": "cit-terminal/0.1"},
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Any:
        try:
            r = await self._client.get(path, params=params)
            r.raise_for_status()
            return r.json()
        except Exception as e:  # noqa: BLE001
            log.warning("binance %s failed: %s", path, e)
            return None

    async def klines(self, symbol: str, interval: str = "1m", limit: int = 200) -> List[List[Any]]:
        data = await self._get("/fapi/v1/klines",
                               {"symbol": symbol, "interval": interval, "limit": limit})
        return data or []

    async def ticker_24h(self, symbol: str) -> Dict[str, Any]:
        return await self._get("/fapi/v1/ticker/24hr", {"symbol": symbol}) or {}

    async def open_interest(self, symbol: str) -> Dict[str, Any]:
        return await self._get("/fapi/v1/openInterest", {"symbol": symbol}) or {}

    async def open_interest_hist(self, symbol: str, period: str = "5m", limit: int = 30) -> List[Dict[str, Any]]:
        return await self._get(
            "/futures/data/openInterestHist",
            {"symbol": symbol, "period": period, "limit": limit},
        ) or []

    async def funding_rate(self, symbol: str) -> Dict[str, Any]:
        data = await self._get("/fapi/v1/premiumIndex", {"symbol": symbol})
        return data or {}

    async def long_short_ratio(self, symbol: str, period: str = "5m") -> List[Dict[str, Any]]:
        return await self._get(
            "/futures/data/globalLongShortAccountRatio",
            {"symbol": symbol, "period": period, "limit": 1},
        ) or []

    async def top_trader_long_short(self, symbol: str, period: str = "5m") -> List[Dict[str, Any]]:
        return await self._get(
            "/futures/data/topLongShortPositionRatio",
            {"symbol": symbol, "period": period, "limit": 1},
        ) or []

    async def taker_buysell_volume(self, symbol: str, period: str = "5m") -> List[Dict[str, Any]]:
        return await self._get(
            "/futures/data/takerlongshortRatio",
            {"symbol": symbol, "period": period, "limit": 1},
        ) or []

    async def snapshot(self, symbol: str) -> Dict[str, Any]:
        """Pull everything we need for one symbol concurrently."""
        (klines, t24, oi, oi_hist, funding,
         lsr, top_lsr, taker) = await asyncio.gather(
            self.klines(symbol, "1m", 200),
            self.ticker_24h(symbol),
            self.open_interest(symbol),
            self.open_interest_hist(symbol, "5m", 30),
            self.funding_rate(symbol),
            self.long_short_ratio(symbol),
            self.top_trader_long_short(symbol),
            self.taker_buysell_volume(symbol),
        )
        return {
            "klines": klines,
            "ticker24h": t24,
            "openInterest": oi,
            "openInterestHist": oi_hist,
            "funding": funding,
            "longShortRatio": lsr,
            "topTraderRatio": top_lsr,
            "takerRatio": taker,
        }
