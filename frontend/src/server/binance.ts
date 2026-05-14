/**
 * Binance Futures source - public, keyless endpoints.
 * Server-side only. Uses native fetch (Node 18+ runtime).
 */

const BASE = "https://fapi.binance.com";

async function get<T>(path: string, params: Record<string, any> = {}): Promise<T | null> {
  const qs = new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>((a, [k, v]) => {
      if (v !== undefined && v !== null) a[k] = String(v);
      return a;
    }, {})
  ).toString();
  const url = `${BASE}${path}${qs ? `?${qs}` : ""}`;
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "cit-terminal/0.1" },
      // Cache for 4s server-side - cheap rate limit safety net.
      next: { revalidate: 4 },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export interface BinanceSnapshot {
  klines: any[][];
  ticker24h: any;
  openInterest: any;
  openInterestHist: any[];
  funding: any;
  longShortRatio: any[];
  topTraderRatio: any[];
  takerRatio: any[];
}

export async function fetchSnapshot(symbol: string): Promise<BinanceSnapshot> {
  const [
    klines, ticker24h, openInterest, openInterestHist, funding,
    longShortRatio, topTraderRatio, takerRatio,
  ] = await Promise.all([
    get<any[][]>("/fapi/v1/klines", { symbol, interval: "1m", limit: 200 }),
    get<any>("/fapi/v1/ticker/24hr", { symbol }),
    get<any>("/fapi/v1/openInterest", { symbol }),
    get<any[]>("/futures/data/openInterestHist", { symbol, period: "5m", limit: 30 }),
    get<any>("/fapi/v1/premiumIndex", { symbol }),
    get<any[]>("/futures/data/globalLongShortAccountRatio", { symbol, period: "5m", limit: 1 }),
    get<any[]>("/futures/data/topLongShortPositionRatio", { symbol, period: "5m", limit: 1 }),
    get<any[]>("/futures/data/takerlongshortRatio", { symbol, period: "5m", limit: 1 }),
  ]);

  return {
    klines: klines ?? [],
    ticker24h: ticker24h ?? {},
    openInterest: openInterest ?? {},
    openInterestHist: openInterestHist ?? [],
    funding: funding ?? {},
    longShortRatio: longShortRatio ?? [],
    topTraderRatio: topTraderRatio ?? [],
    takerRatio: takerRatio ?? [],
  };
}
