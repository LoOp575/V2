export interface Candle {
  time: number;
  open: number; high: number; low: number; close: number; volume: number;
}

export interface Scores {
  cpi: number;
  expansion_probability: number;
  market_stability: number;
  smart_money_confidence: number;
  squeeze_probability: number;
  accumulation_score: number;
  manipulation_risk: number;
  volatility_pressure: number;
  momentum_strength: number;
}

export interface Interaction {
  voi: number; smf: number; pressure: number; trap: number; flow: number;
}

export interface Detection {
  phase: "ACCUMULATION" | "DISTRIBUTION" | "TRAP" | "EXPANSION" | "NEUTRAL";
  confidence: number;
  flags: string[];
  regime: "TREND_UP" | "TREND_DOWN" | "RANGE" | "VOLATILE";
}

export interface Normalized {
  volume: number; oi: number; whale: number; sm: number;
  momentum: number; vol: number; noise: number;
  funding: number; liq: number; flow: number;
}

export interface Raw {
  volume24h: number;
  openInterest: number;
  fundingRate: number;
  longShortRatio: number;
  topTraderRatio: number;
  takerBuyRatio: number;
  realizedVol: number;
  momentumSigned: number;
  oiDelta: number;
}

export interface SymbolSnapshot {
  symbol: string;
  price: number;
  raw: Raw;
  normalized: Normalized;
  interaction: Interaction;
  scores: Scores;
  detection: Detection;
  narrative: string;
  candles: Candle[];
}

export interface Feeds {
  whale: any[];
  liquidation: any[];
  funding: any[];
  smart_money: any[];
  exchange_flow: any[];
}

export interface WSPayload {
  type: "snapshot" | "ping";
  ts?: number;
  data?: Record<string, SymbolSnapshot>;
  feeds?: Feeds;
}
