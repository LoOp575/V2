"""FastAPI entrypoint for the Crypto Intelligence Terminal."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .config import settings
from .services.aggregator import aggregator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await aggregator.start()
    try:
        yield
    finally:
        await aggregator.stop()


app = FastAPI(
    title="Crypto Intelligence Terminal",
    version="0.1.0",
    description="Quant-grade crypto intelligence: CPI scoring, "
                "interaction matrix, accumulation/distribution detection.",
    lifespan=lifespan,
    root_path=settings.root_path,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": "Crypto Intelligence Terminal",
        "version": "0.1.0",
        "docs": "/docs",
        "ws": "/api/ws",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=False)
