export const fmtUSD = (n: number, d = 2) =>
  Number.isFinite(n)
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d })
    : "—";

export const fmtNum = (n: number, d = 2) =>
  Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: d }) : "—";

export const fmtPct = (n: number, d = 2) =>
  Number.isFinite(n) ? `${(n * 100).toFixed(d)}%` : "—";

export const fmtCompact = (n: number) =>
  Number.isFinite(n)
    ? Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n)
    : "—";

export const ago = (ts: number) => {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
};
