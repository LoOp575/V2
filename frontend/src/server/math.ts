/**
 * Math engines - direct TypeScript port of backend/app/engine/*.
 * Stateless: each call computes everything from one snapshot.
 */

// ---------- helpers ----------

export const clip01 = (x: number) =>
  !Number.isFinite(x) ? 0 : x < 0 ? 0 : x > 1 ? 1 : x;

export const num = (v: unknown, d = 0) => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : d;
};

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0);
const stddev = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / a.length);
};

export const percentile = (history: number[], value: number) => {
  if (!history.length) return 0.5;
  let n = 0;
  for (const x of history) if (x <= value) n++;
  return n / history.length;
};

export { sum, mean, stddev };

// ---------- interaction ----------

export interface InteractionSet {
  voi: number; smf: number; pressure: number; trap: number; flow: number;
}

export function computeInteractions(p: {
  v: number; oi: number; w: number; sm: number;
  f: number; l: number; flow_out: number;
}): InteractionSet {
  return {
    voi: p.v * p.oi,
    smf: p.w * p.v,
    pressure: p.oi * p.f,
    trap: p.oi * p.l * p.f,
    flow: p.flow_out * p.w,
  };
}

// ---------- intelligence (CPI + 8 derived scores) ----------

export interface IntelligenceScores {
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

export function computeScores(p: {
  w: number; sm: number; v: number; oi: number; m: number;
  r: number; n: number; f: number; l: number;
  flow_out: number; delta: number;
}): IntelligenceScores {
  const numerator = p.w * p.sm * p.v * p.oi * p.m;
  const denom = (1 + p.r) * (1 + p.n) * (1 + p.f) * (1 + p.l);
  const cpi = clip01(denom ? numerator / denom : 0);

  return {
    cpi,
    expansion_probability: clip01(
      0.45 * (p.v * p.oi) + 0.25 * p.m + 0.15 * p.sm + 0.15 * p.w - 0.35 * p.r
    ),
    market_stability: clip01(1 - (0.5 * p.r + 0.3 * p.n + 0.2 * p.f)),
    smart_money_confidence: clip01(0.55 * p.sm + 0.25 * p.w + 0.20 * p.flow_out),
    squeeze_probability: clip01(
      0.45 * p.f + 0.35 * p.l + 0.20 * p.oi - 0.20 * p.v
    ),
    accumulation_score: clip01(
      0.35 * p.flow_out + 0.25 * p.w + 0.20 * p.v + 0.20 * (1 - p.r) - 0.15 * Math.abs(p.delta)
    ),
    manipulation_risk: clip01(0.45 * p.n + 0.30 * p.f + 0.25 * p.l - 0.20 * p.sm),
    volatility_pressure: clip01(0.6 * p.r + 0.4 * p.n),
    momentum_strength: clip01(p.m),
  };
}

// ---------- detection ----------

export interface Detection {
  phase: "ACCUMULATION" | "DISTRIBUTION" | "TRAP" | "EXPANSION" | "NEUTRAL";
  confidence: number;
  flags: string[];
  regime: "TREND_UP" | "TREND_DOWN" | "RANGE" | "VOLATILE";
}

export function detect(p: {
  v: number; oi: number; w: number; sm: number; m: number;
  r: number; n: number; f: number; l: number;
  flow_out: number; delta: number;
  scores: IntelligenceScores;
}): Detection {
  const flags: string[] = [];

  const accumulation =
    0.30 * (1 - Math.abs(p.delta)) +
    0.20 * p.v +
    0.20 * p.oi +
    0.20 * p.flow_out +
    0.10 * p.w;

  const distribution =
    0.30 * Math.max(p.delta, 0) +
    0.25 * p.f +
    0.20 * (1 - p.flow_out) +
    0.15 * p.n +
    0.10 * (1 - p.w);

  const trap =
    0.35 * p.oi +
    0.30 * p.f +
    0.20 * p.l +
    0.15 * (1 - p.v);

  const expansion =
    0.35 * (p.v * p.oi) +
    0.25 * p.scores.momentum_strength +
    0.20 * p.sm +
    0.20 * (1 - p.r);

  const candidates: Array<[Detection["phase"], number]> = [
    ["ACCUMULATION", accumulation],
    ["DISTRIBUTION", distribution],
    ["TRAP", trap],
    ["EXPANSION", expansion],
  ];
  let [phase, conf] = candidates.reduce((a, b) => (b[1] > a[1] ? b : a));
  if (conf < 0.45) phase = "NEUTRAL";

  const regime: Detection["regime"] =
    p.r > 0.7 ? "VOLATILE" :
    p.delta > 0.25 ? "TREND_UP" :
    p.delta < -0.25 ? "TREND_DOWN" :
    "RANGE";

  if (p.f > 0.75) flags.push("FUNDING_OVERHEATED");
  if (p.l > 0.7) flags.push("LIQUIDATION_CLUSTER");
  if (p.oi > 0.8 && p.v < 0.4) flags.push("LEVERAGE_DIVERGENCE");
  if (p.w > 0.7 && p.flow_out > 0.6) flags.push("WHALE_ACCUMULATION");
  if (p.n > 0.75) flags.push("HIGH_NOISE");
  if (p.scores.squeeze_probability > 0.7) flags.push("SQUEEZE_RISK");
  if (p.scores.expansion_probability > 0.7) flags.push("EXPANSION_PRIMED");

  return { phase, confidence: Number(conf.toFixed(4)), flags, regime };
}

// ---------- AI interpretation ----------

const band = (x: number) => (x < 0.33 ? "low" : x < 0.66 ? "moderate" : "elevated");

export function narrate(symbol: string,
                        scores: IntelligenceScores,
                        det: Detection,
                        norm: { funding: number; oi: number; whale: number }): string {
  const { phase, regime, flags } = det;
  const lines: string[] = [];
  lines.push(
    `${symbol}: regime ${regime}, phase ${phase}. ` +
    `CPI ${scores.cpi.toFixed(2)}, expansion ${scores.expansion_probability.toFixed(2)}, ` +
    `stability ${scores.market_stability.toFixed(2)}.`
  );
  switch (phase) {
    case "ACCUMULATION":
      lines.push(
        `Volume and open-interest interaction rising on a ${band(scores.volatility_pressure)} ` +
        `volatility backdrop; smart-money confidence ${scores.smart_money_confidence.toFixed(2)} ` +
        `suggests structured demand absorption.`
      );
      break;
    case "DISTRIBUTION":
      lines.push(
        `Price advance with funding ${norm.funding.toFixed(2)} and elevated participation; ` +
        `whale activity ${norm.whale.toFixed(2)} consistent with profit redistribution.`
      );
      break;
    case "TRAP":
      lines.push(
        `Open-interest at ${norm.oi.toFixed(2)} stretched against weaker spot demand. ` +
        `Squeeze probability ${scores.squeeze_probability.toFixed(2)}; ` +
        `leverage trap conditions present.`
      );
      break;
    case "EXPANSION":
      lines.push(
        `Compression breaking with positive interaction energy (VOI). ` +
        `Momentum acceleration constructive, expansion probability ${scores.expansion_probability.toFixed(2)}.`
      );
      break;
    default:
      lines.push(
        `No dominant phase. Accumulation ${scores.accumulation_score.toFixed(2)}, ` +
        `manipulation risk ${scores.manipulation_risk.toFixed(2)}; ` +
        `stand-by until interaction strength resolves.`
      );
  }
  if (flags.length) lines.push("Flags: " + flags.join(", ") + ".");
  return lines.join(" ");
}
