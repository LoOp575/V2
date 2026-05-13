"use client";
import { useStore } from "@/lib/store";
import { fmtCompact, fmtPct, fmtUSD } from "@/lib/format";

export function TopBar() {
  const { connected, selected, symbols, setSelected, data } = useStore();
  const snap = data[selected];

  return (
    <header className="h-12 border-b border-line bg-bg-1 flex items-center px-4 gap-6">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            connected ? "bg-accent-green shadow-[0_0_8px_#22C55E]" : "bg-accent-red"
          }`}
        />
        <span className="text-[12px] tracking-[0.2em] text-text-hi">CIT</span>
        <span className="text-[10px] text-text-mid uppercase tracking-widest">
          Crypto Intelligence Terminal
        </span>
      </div>

      <div className="flex items-center gap-1">
        {symbols.length === 0 ? (
          <span className="text-[11px] text-text-lo">awaiting data…</span>
        ) : (
          symbols.map((s) => (
            <button
              key={s}
              onClick={() => setSelected(s)}
              className={`text-[11px] px-2 py-1 rounded border tracking-wider ${
                s === selected
                  ? "border-accent-cyan/60 text-accent-cyan bg-accent-cyan/10"
                  : "border-line text-text-mid hover:text-text-hi hover:border-text-mid"
              }`}
            >
              {s}
            </button>
          ))
        )}
      </div>

      <div className="ml-auto flex items-center gap-6 text-[11px]">
        {snap ? (
          <>
            <Stat label="Price" value={fmtUSD(snap.price)} />
            <Stat
              label="24h Vol"
              value={fmtCompact(snap.raw.volume24h)}
            />
            <Stat
              label="OI"
              value={fmtCompact(snap.raw.openInterest)}
              tone={snap.raw.oiDelta > 0 ? "good" : "bad"}
              extra={`${snap.raw.oiDelta >= 0 ? "+" : ""}${(snap.raw.oiDelta * 100).toFixed(2)}%`}
            />
            <Stat
              label="Funding"
              value={fmtPct(snap.raw.fundingRate, 4)}
              tone={snap.raw.fundingRate >= 0 ? "good" : "bad"}
            />
            <Stat label="L/S" value={snap.raw.longShortRatio.toFixed(2)} />
            <Stat label="Top L/S" value={snap.raw.topTraderRatio.toFixed(2)} />
          </>
        ) : (
          <span className="text-text-lo">—</span>
        )}
      </div>
    </header>
  );
}

function Stat({ label, value, tone, extra }: {
  label: string; value: string;
  tone?: "good" | "bad"; extra?: string;
}) {
  const color = tone === "good" ? "text-accent-green"
              : tone === "bad" ? "text-accent-red"
              : "text-text-hi";
  return (
    <div className="flex flex-col items-end leading-none">
      <span className="text-[9px] uppercase tracking-[0.2em] text-text-mid">{label}</span>
      <span className={`tabular-nums ${color}`}>
        {value} {extra && <span className="text-[10px] text-text-mid">{extra}</span>}
      </span>
    </div>
  );
}
