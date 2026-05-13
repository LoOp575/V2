"use client";
import type { Interaction, Normalized } from "@/lib/types";

/** 6x6 heatmap: pairwise products of normalized core variables. */
export function InteractionMatrix({ norm, inter }: { norm: Normalized; inter: Interaction }) {
  const labels = [
    { k: "volume", l: "V" },
    { k: "oi", l: "OI" },
    { k: "whale", l: "W" },
    { k: "sm", l: "SM" },
    { k: "momentum", l: "M" },
    { k: "funding", l: "F" },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-text-mid mb-2">
          Interaction Matrix
        </div>
        <div className="grid" style={{ gridTemplateColumns: `28px repeat(${labels.length}, 1fr)` }}>
          <div />
          {labels.map((c) => (
            <div key={c.k} className="text-[10px] text-text-mid text-center">{c.l}</div>
          ))}
          {labels.map((row) => (
            <Row key={row.k} row={row} cols={labels} norm={norm} />
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-text-mid mb-2">
          Composite Signals
        </div>
        <ul className="space-y-2 text-[12px]">
          <Composite label="VOI (V·OI)" v={inter.voi} hint="leverage / expansion energy" />
          <Composite label="SMF (W·V)"  v={inter.smf} hint="institutional pressure" />
          <Composite label="Pressure (OI·F)" v={inter.pressure} hint="directional leverage" />
          <Composite label="Trap (OI·L·F)" v={inter.trap} hint="liquidation trap risk" tone="bad" />
          <Composite label="Flow (Out·W)" v={inter.flow} hint="accumulation flow energy" tone="good" />
        </ul>
      </div>
    </div>
  );
}

function Row({ row, cols, norm }: any) {
  return (
    <>
      <div className="text-[10px] text-text-mid pr-1 flex items-center justify-end h-6">{row.l}</div>
      {cols.map((c: any) => {
        const v = (norm[row.k] ?? 0) * (norm[c.k] ?? 0);
        const a = Math.max(0.04, Math.min(1, v));
        return (
          <div
            key={c.k}
            className="h-6 mx-[1px] rounded-[2px] flex items-center justify-center text-[10px]"
            style={{
              background: `rgba(34,211,238,${a.toFixed(3)})`,
              color: a > 0.55 ? "#05070A" : "#8B97A8",
            }}
            title={`${row.l}·${c.l} = ${v.toFixed(3)}`}
          >
            {v.toFixed(2)}
          </div>
        );
      })}
    </>
  );
}

function Composite({
  label, v, hint, tone = "neutral",
}: { label: string; v: number; hint: string; tone?: "good" | "bad" | "neutral" }) {
  const x = Math.max(0, Math.min(1, v));
  const color = tone === "good" ? "#22C55E" : tone === "bad" ? "#EF4444" : "#22D3EE";
  return (
    <li>
      <div className="flex items-baseline justify-between">
        <span className="text-text-hi">{label}</span>
        <span className="tabular-nums text-text-mid">{x.toFixed(3)}</span>
      </div>
      <div className="h-1.5 bg-bg-3 rounded-sm overflow-hidden mt-0.5">
        <div className="h-full" style={{ width: `${x * 100}%`, background: color, boxShadow: `0 0 8px ${color}66` }} />
      </div>
      <div className="text-[10px] text-text-lo">{hint}</div>
    </li>
  );
}
