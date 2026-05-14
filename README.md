# Crypto Intelligence Terminal (CIT)

Quant-grade crypto intelligence terminal. Transforms chaotic market data
into structured probabilistic insight using a multi-variable interaction
model. **Not** a retail signal bot.

```
MARKET DATA
    -> NORMALIZATION ENGINE (rolling min-max, z, percentile)
    -> INTERACTION ENGINE  (VOI, SMF, pressure, trap, flow)
    -> INTELLIGENCE ENGINE (CPI master formula + 8 derived scores)
    -> DETECTION ENGINE    (accumulation / distribution / trap / expansion)
    -> AI INTERPRETER      (institutional-style narrative)
    -> TERMINAL UI         (chart | intelligence | feeds)
```

## Master formula

```
        W . SM . V . OI . M
CPI = ---------------------------
       (1+R)(1+N)(1+F)(1+L)
```

| symbol | meaning                   |
|--------|---------------------------|
| W      | whale activity score      |
| SM     | smart-money cluster score |
| V      | normalized volume         |
| OI     | open-interest strength    |
| M      | momentum acceleration     |
| R      | volatility risk           |
| N      | market noise              |
| F      | funding overheating       |
| L      | liquidation pressure      |

All inputs are normalized to `[0,1]` on a rolling window before being fed
into the formula, so CPI is bounded in `[0,1]` and directly plottable.

## Repository layout

```
V2/
  backend/                 FastAPI + asyncio aggregator
    app/
      config.py            env-driven settings (pydantic-settings)
      main.py              app factory, lifespan, CORS
      api/routes.py        REST + WebSocket
      engine/
        normalization.py   rolling min-max / z / percentile
        interaction.py     VOI, SMF, pressure, trap, flow
        intelligence.py    CPI + 8 derived scores
        detection.py       phase classifier + regime + flags
        ai_interpreter.py  template-driven narrative
      services/
        aggregator.py      periodic refresh loop, in-process pubsub
      sources/
        binance.py         public futures endpoints (keyless)
        derived.py         whale/SM/flow proxies from market data
    requirements.txt
    Dockerfile
    .env.example

  frontend/                Next.js 14 (App Router) + Tailwind
    src/
      app/                 layout, page, globals
      components/
        Terminal.tsx       composes the 3-panel layout
        TopBar.tsx         connection / symbols / price / OI / funding
        PriceChart.tsx     lightweight-charts candles + volume
        IntelligencePanel  CPI gauge + 8 metric bars + matrix + AI text
        InteractionMatrix  6x6 pairwise heatmap + composite signals
        Feeds.tsx          whale | liq | funding | SM | flow streams
        CPIGauge.tsx       SVG arc gauge with animated needle
        MetricBar.tsx      color-graded normalized score
        Panel.tsx          panel chrome
      lib/
        store.ts           zustand store
        ws.ts              WebSocket client + REST hydrate
        types.ts           shared types
        format.ts          number formatters
    package.json
    Dockerfile
    .env.local.example

  docker-compose.yml
```

## Running it

### Option A - Vercel (one-click, no backend needed)

The Next.js app ships with an in-app `/api/snapshot` route handler that
talks to Binance directly, so the **frontend alone is enough**.

1. Push this repo to GitHub.
2. On Vercel: New Project -> import the repo.
3. Set **Root Directory** to `frontend`.
4. (Optional) `SYMBOLS=BTCUSDT,ETHUSDT,SOLUSDT` env var.
5. Deploy.

The terminal will poll `/api/snapshot` every 5 seconds and render live.
No FastAPI service is required. Vercel cannot host WebSocket, so the
client uses REST polling on Vercel - the math and detection are the
same.

### Option B - Docker (frontend + FastAPI backend)

Use this when you want the persistent rolling-window normalizer and
WebSocket stream from the FastAPI service.

```bash
cd V2
cp backend/.env.example backend/.env
docker compose up --build
# frontend  http://localhost:3000
# backend   http://localhost:8000/docs
```

### Option C - Local dev

Backend:

```bash
cd V2/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd V2/frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

## Two deploy modes, one math

| layer            | Vercel (zero-backend)              | Self-hosted (FastAPI)               |
|------------------|------------------------------------|-------------------------------------|
| math engine      | TS port in `frontend/src/server`   | Python in `backend/app/engine`      |
| transport        | REST polling (5s)                  | WebSocket + REST                    |
| normalization    | percentile per request             | persistent 720-tick rolling window  |
| feeds history    | last tick only                     | rolling 120 events / feed           |
| where to deploy  | Vercel                             | Railway / Render / Fly / VPS        |
| cost             | free                               | varies                              |

The TS port is a faithful re-implementation of the Python engines: same
CPI formula, same interaction set, same detection thresholds, same
flag rules. Switching deploy mode does not change the model.

## Configuration

`backend/.env`:

| key                | default                        | meaning                                  |
|--------------------|--------------------------------|------------------------------------------|
| `SYMBOLS`          | `BTCUSDT,ETHUSDT,SOLUSDT`      | Binance Futures perp symbols             |
| `REFRESH_INTERVAL` | `5`                            | aggregation loop period (s)              |
| `HISTORY_SIZE`     | `720`                          | rolling window length per variable       |
| `CORS_ORIGINS`     | `http://localhost:3000`        | comma-separated allowed origins          |
| `HOST` / `PORT`    | `0.0.0.0` / `8000`             | uvicorn bind                             |

`frontend/.env.local`:

| key                    | default                     |
|------------------------|-----------------------------|
| `NEXT_PUBLIC_API_BASE` | `http://localhost:8000`     |
| `NEXT_PUBLIC_WS_URL`   | `ws://localhost:8000/api/ws`|

## API surface

| method | path                       | purpose                                |
|--------|----------------------------|----------------------------------------|
| GET    | `/api/health`              | liveness + active symbols              |
| GET    | `/api/symbols`             | configured symbols                     |
| GET    | `/api/snapshot`            | latest snapshot for all symbols + feeds|
| GET    | `/api/snapshot/{symbol}`   | single-symbol snapshot                 |
| WS     | `/api/ws`                  | streaming snapshots every tick         |

WebSocket message shape:

```jsonc
{
  "type": "snapshot",
  "ts": 1731500000000,
  "data": {
    "BTCUSDT": {
      "price": 65432.1,
      "raw":          { "...": "..." },
      "normalized":   { "volume": 0.62, "oi": 0.71, "...": "..." },
      "interaction":  { "voi": 0.44, "smf": 0.21, "...": "..." },
      "scores":       { "cpi": 0.38, "expansion_probability": 0.66, "...": "..." },
      "detection":    { "phase": "EXPANSION", "regime": "TREND_UP",
                        "confidence": 0.61, "flags": ["EXPANSION_PRIMED"] },
      "narrative":    "BTCUSDT: regime TREND_UP, phase EXPANSION...",
      "candles":      [ { "time": 1731500000, "open": 0, "high": 0,
                          "low": 0, "close": 0, "volume": 0 } ]
    }
  },
  "feeds": { "whale": [], "liquidation": [], "funding": [],
             "smart_money": [], "exchange_flow": [] }
}
```

## Detection engine

Each tick, the engine computes scores for the four candidate phases and
takes the argmax (with a `0.45` confidence threshold below which the
phase is reported as `NEUTRAL`).

| phase         | dominant inputs                                          |
|---------------|----------------------------------------------------------|
| ACCUMULATION  | flat price, rising V and OI, positive flow, whales in   |
| DISTRIBUTION  | rising price, hot funding, whale outflow, retail noise  |
| TRAP          | OI stretched, funding extreme, weak spot, liq clusters  |
| EXPANSION     | VOI rising, momentum, SM positive, compression breaking |

A regime tag (`TREND_UP / TREND_DOWN / RANGE / VOLATILE`) is added
independently from realized vol and signed momentum.

Flags surfaced when triggered:

`FUNDING_OVERHEATED`, `LIQUIDATION_CLUSTER`, `LEVERAGE_DIVERGENCE`,
`WHALE_ACCUMULATION`, `HIGH_NOISE`, `SQUEEZE_RISK`, `EXPANSION_PRIMED`.

## Notes on the data layer

The backend uses **public, keyless** Binance Futures endpoints:
`/fapi/v1/klines`, `/fapi/v1/ticker/24hr`, `/fapi/v1/openInterest`,
`/futures/data/openInterestHist`, `/fapi/v1/premiumIndex`,
`/futures/data/globalLongShortAccountRatio`,
`/futures/data/topLongShortPositionRatio`,
`/futures/data/takerlongshortRatio`.

True on-chain whale data (Arkham, Nansen, Whale Alert) requires paid keys.
Until those are wired, the `derived.py` module produces mathematically
defensible **proxies** for the on-chain layer:

* **Whale activity (W)** - concentration of volume in the top-5% of bars
* **Smart money (SM)** - signed divergence between top-trader L/S and global L/S
* **Exchange outflow (flow_out)** - taker-buy / taker-sell ratio mapped to `[0,1]`
* **Liquidation pressure (L)** - `|funding| * crowdedness * |OI delta|` composite

To plug a real provider, replace the corresponding fields in
`backend/app/sources/derived.py` (or add a new source module that the
aggregator calls and merge into `RawSignals`).

## Deployment

* **Frontend** - Vercel (`frontend/` as project root, set `NEXT_PUBLIC_*`)
* **Backend** - Railway / Render / Fly.io / any VPS with the provided Dockerfile

## License / disclaimer

Engineering reference. **Not financial advice. Not a trading signal.**
The CPI score and detected phases are model outputs over noisy public
data and may be wrong at any moment.
