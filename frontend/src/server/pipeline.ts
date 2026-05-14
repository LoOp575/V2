/**
 * Snapshot pipeline.
 *   binance -> derive -> normalize -> interaction -> intelligence ->
 *   detection -> narrative -> ui-shaped snapshot
 *
 * Stateless: every call recomputes from a fresh fetch. Suitable for
 * Vercel serverless functions. The persistent FastAPI backend is the
 * alternative for self-hosting (richer rolling-window normalization).
 */
import { fetchSnapshot, BinanceSnapshot } from "./binance";
import {
  clip01, num, percentile, mean, stddev,
  computeInteractions, computeScores, detect, narrate,
  type IntelligenceScores,
} from "./math";

export interface Candle {
  time: number; open: number; high: number; low: number; close: number; volume: number;
}

export interface SymbolSnapshot {
  symbol: string;
  price: number;
  raw: {
    volume24h: number;
    openInterest: number;
    fundingRate: number;
    longShortRatio: number;
    topTraderRatio: number;
    takerBuyRatio: number;
    realizedVol: number;
    momentumSigned: number;
    oiDelta: number;
  };
  normalized: Record<string, number>;
  interaction: { voi: number; smf: number; pressure: number; trap: number; flow: number };
  scores: IntelligenceScores;
  detection: ReturnType<typeof detect>;
  narrative: string;
  candles: Candle[];
}

interface DerivedSignals {
  price: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
  longShortRatio: number;
  topTraderRatio: number;
  takerBuyRatio: number;
  momentumAbs: number;
  momentumSigned: number;
  realizedVol: number;
  noise: number;
  oiDelta: number;
  whaleProxy: number;
  smartMoneyProxy: number;
  flowOutProxy: number;
  liqPressure: number;
  vols: number[];
  oiSeries: number[];
  lastBarVol: number;
}

function derive(snap: BinanceSnapshot): DerivedSignals {
  const closes = snap.klines.map((k) => num(k[4]));
  const vols = snap.klines.map((k) => num(k[5]));

  const price = closes[closes.length - 1] ?? 0;

  let momentumAbs = 0, momentumSigned = 0, realizedVol = 0, noise = 0;
  if (closes.length >= 30) {
    const rets: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      const a = Math.max(closes[i - 1], 1e-12);
      const b = Math.max(closes[i], 1e-12);
      rets.push(Math.log(b / a));
    }
    const recent = rets.slice(-5);
    const sd = stddev(rets) || 1e-9;
    momentumSigned = Math.tanh(mean(recent) / sd);
    momentumAbs = Math.abs(momentumSigned);
    realizedVol = sd * Math.sqrt(60);

    const last30 = closes.slice(-30);
    const net = Math.abs(last30[last30.length - 1] - last30[0]) || 1e-9;
    let path = 0;
    for (let i = 1; i < last30.length; i++) path += Math.abs(last30[i] - last30[i - 1]);
    noise = Math.min(1, (path / Math.max(net, 1e-9)) / 10);
  }

  // top-5% bar volume concentration
  let whaleProxy = 0;
  if (vols.length) {
    const sorted = [...vols].sort((a, b) => b - a);
    const topN = Math.max(1, Math.floor(vols.length / 20));
    const topSum = sorted.slice(0, topN).reduce((a, b) => a + b, 0);
    const total = sorted.reduce((a, b) => a + b, 0) + 1e-9;
    whaleProxy = topSum / total;
  }

  const volume24h = num(snap.ticker24h?.quoteVolume);
  const openInterest = num(snap.openInterest?.openInterest);
  const oiSeries = (snap.openInterestHist ?? []).map((x) => num(x?.sumOpenInterest));

  let oiDelta = 0;
  if (oiSeries.length) {
    const avg = mean(oiSeries) || 1e-9;
    oiDelta = (openInterest - avg) / avg;
  }

  const fundingRate = num(snap.funding?.lastFundingRate);
  const longShortRatio = snap.longShortRatio?.length
    ? num(snap.longShortRatio[snap.longShortRatio.length - 1].longShortRatio, 1) : 1;
  const topTraderRatio = snap.topTraderRatio?.length
    ? num(snap.topTraderRatio[snap.topTraderRatio.length - 1].longShortRatio, 1) : 1;
  const takerBuyRatio = snap.takerRatio?.length
    ? num(snap.takerRatio[snap.takerRatio.length - 1].buySellRatio, 1) : 1;

  const sm = Math.tanh(topTraderRatio - longShortRatio);
  const smartMoneyProxy = (sm + 1) / 2;
  const flowOutProxy = (Math.tanh(takerBuyRatio - 1) + 1) / 2;

  const crowded = Math.abs(longShortRatio - 1);
  const liqPressure = Math.min(
    1,
    Math.abs(fundingRate) * 200 * 0.5 +
      Math.min(1, crowded) * 0.3 +
      Math.min(1, Math.abs(oiDelta) * 5) * 0.2,
  );

  return {
    price, volume24h, openInterest, fundingRate,
    longShortRatio, topTraderRatio, takerBuyRatio,
    momentumAbs, momentumSigned, realizedVol, noise, oiDelta,
    whaleProxy, smartMoneyProxy, flowOutProxy, liqPressure,
    vols, oiSeries, lastBarVol: vols[vols.length - 1] ?? 0,
  };
}

function buildSnapshot(symbol: string, snap: BinanceSnapshot): SymbolSnapshot {
  const s = derive(snap);

  // Normalization: percentile where we have history, fixed clip otherwise.
  const norm = {
    volume: clip01(percentile(s.vols, s.lastBarVol)),
    oi: clip01(percentile([...s.oiSeries, s.openInterest], s.openInterest)),
    whale: clip01(s.whaleProxy),
    sm: clip01(s.smartMoneyProxy),
    momentum: clip01(s.momentumAbs),
    vol: clip01(s.realizedVol / 0.05), // 5% per hour as "max"
    noise: clip01(s.noise),
    funding: clip01(Math.abs(s.fundingRate) / 0.001), // 0.1% as "hot"
    liq: clip01(s.liqPressure),
    flow: clip01(s.flowOutProxy),
  };

  const interaction = computeInteractions({
    v: norm.volume, oi: norm.oi, w: norm.whale, sm: norm.sm,
    f: norm.funding, l: norm.liq, flow_out: norm.flow,
  });

  const scores = computeScores({
    w: norm.whale, sm: norm.sm, v: norm.volume, oi: norm.oi, m: norm.momentum,
    r: norm.vol, n: norm.noise, f: norm.funding, l: norm.liq,
    flow_out: norm.flow, delta: s.momentumSigned,
  });

  const detection = detect({
    v: norm.volume, oi: norm.oi, w: norm.whale, sm: norm.sm, m: norm.momentum,
    r: norm.vol, n: norm.noise, f: norm.funding, l: norm.liq,
    flow_out: norm.flow, delta: s.momentumSigned, scores,
  });

  const narrative = narrate(symbol, scores, detection, {
    funding: norm.funding, oi: norm.oi, whale: norm.whale,
  });

  const candles: Candle[] = (snap.klines ?? []).slice(-200).map((k) => ({
    time: Math.floor(num(k[0]) / 1000),
    open: num(k[1]),
    high: num(k[2]),
    low: num(k[3]),
    close: num(k[4]),
    volume: num(k[5]),
  }));

  return {
    symbol,
    price: s.price,
    raw: {
      volume24h: s.volume24h,
      openInterest: s.openInterest,
      fundingRate: s.fundingRate,
      longShortRatio: s.longShortRatio,
      topTraderRatio: s.topTraderRatio,
      takerBuyRatio: s.takerBuyRatio,
      realizedVol: s.realizedVol,
      momentumSigned: s.momentumSigned,
      oiDelta: s.oiDelta,
    },
    normalized: norm,
    interaction,
    scores,
    detection,
    narrative,
    candles,
  };
}

export interface FullSnapshot {
  data: Record<string, SymbolSnapshot>;
  feeds: {
    whale: any[];
    liquidation: any[];
    funding: any[];
    smart_money: any[];
    exchange_flow: any[];
  };
}

/**
 * Build a complete snapshot for the given symbols. The first symbol
 * drives the global feeds (matches the FastAPI backend behavior).
 */
export async function buildFullSnapshot(symbols: string[]): Promise<FullSnapshot> {
  const results = await Promise.all(
    symbols.map(async (sym) => {
      try {
        const raw = await fetchSnapshot(sym);
        return [sym, buildSnapshot(sym, raw)] as const;
      } catch {
        return [sym, null] as const;
      }
    })
  );

  const data: Record<string, SymbolSnapshot> = {};
  for (const [sym, snap] of results) if (snap) data[sym] = snap;

  // Synthesize current-tick feed events from the leading symbol.
  const lead = symbols[0] ? data[symbols[0]] : undefined;
  const feeds: FullSnapshot["feeds"] = {
    whale: [], liquidation: [], funding: [], smart_money: [], exchange_flow: [],
  };

  if (lead) {
    const ts = Date.now();
    const n = lead.normalized;
    const r = lead.raw;
    feeds.funding.push({ ts, symbol: lead.symbol, rate: r.fundingRate, score: n.funding });
    if (n.whale > 0.6) {
      feeds.whale.push({
        ts, symbol: lead.symbol, intensity: Number(n.whale.toFixed(3)),
        direction: n.flow < 0.5 ? "INFLOW" : "OUTFLOW",
      });
    }
    if (n.liq > 0.55) {
      feeds.liquidation.push({
        ts, symbol: lead.symbol, pressure: Number(n.liq.toFixed(3)),
        side: r.longShortRatio > 1.05 ? "LONGS"
            : r.longShortRatio < 0.95 ? "SHORTS" : "BOTH",
      });
    }
    if (n.sm > 0.6) {
      feeds.smart_money.push({
        ts, symbol: lead.symbol, score: Number(n.sm.toFixed(3)),
        bias: r.topTraderRatio > r.longShortRatio ? "LONG" : "SHORT",
      });
    }
    feeds.exchange_flow.push({
      ts, symbol: lead.symbol, flow: Number(n.flow.toFixed(3)),
      direction: n.flow > 0.5 ? "OUTFLOW" : "INFLOW",
    });
  }

  return { data, feeds };
}
