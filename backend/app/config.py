"""Runtime configuration loaded from environment variables."""
from __future__ import annotations

from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    symbols: str = Field(default="BTCUSDT,ETHUSDT,SOLUSDT")
    refresh_interval: float = Field(default=5.0)
    history_size: int = Field(default=720)
    cors_origins: str = Field(default="http://localhost:3000")

    coingecko_api_key: str | None = None
    arkham_api_key: str | None = None
    dexscreener_api_key: str | None = None

    host: str = "0.0.0.0"
    port: int = 8000

    @property
    def symbols_list(self) -> List[str]:
        return [s.strip().upper() for s in self.symbols.split(",") if s.strip()]

    @property
    def cors_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
