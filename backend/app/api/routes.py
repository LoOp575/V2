"""REST + WebSocket routes for the terminal."""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from ..config import settings
from ..services.aggregator import aggregator

log = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health() -> Dict[str, Any]:
    return {"status": "ok", "symbols": settings.symbols_list}


@router.get("/symbols")
async def symbols() -> Dict[str, Any]:
    return {"symbols": settings.symbols_list}


@router.get("/snapshot")
async def snapshot_all() -> Dict[str, Any]:
    return {
        "data": aggregator.snapshots,
        "feeds": {k: list(v) for k, v in aggregator.feeds.items()},
    }


@router.get("/snapshot/{symbol}")
async def snapshot_one(symbol: str) -> Dict[str, Any]:
    symbol = symbol.upper()
    snap = aggregator.snapshots.get(symbol)
    if not snap:
        raise HTTPException(status_code=404, detail=f"unknown symbol: {symbol}")
    return snap


@router.websocket("/ws")
async def ws(websocket: WebSocket) -> None:
    await websocket.accept()
    queue = aggregator.subscribe()
    log.info("ws client connected; subscribers=%d", len(aggregator._subscribers))

    # Send initial snapshot immediately if we have one
    if aggregator.snapshots:
        await websocket.send_json({
            "type": "snapshot",
            "data": aggregator.snapshots,
            "feeds": {k: list(v) for k, v in aggregator.feeds.items()},
        })

    try:
        while True:
            try:
                payload = await asyncio.wait_for(queue.get(), timeout=25.0)
                await websocket.send_json(payload)
            except asyncio.TimeoutError:
                # Keep-alive ping to prevent proxy / platform timeout
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        pass
    except Exception as e:  # noqa: BLE001
        log.warning("ws error: %s", e)
    finally:
        aggregator.unsubscribe(queue)
