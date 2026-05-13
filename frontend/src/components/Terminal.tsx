"use client";
import { useTerminalSocket } from "@/lib/ws";
import { useStore } from "@/lib/store";
import { TopBar } from "./TopBar";
import { Panel } from "./Panel";
import { PriceChart } from "./PriceChart";
import { IntelligencePanel } from "./IntelligencePanel";
import { FeedsPanel } from "./Feeds";

export default function Terminal() {
  useTerminalSocket();
  const { selected, data, feeds } = useStore();
  const snap = data[selected];

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 min-h-0 grid gap-2 p-2"
            style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1.5fr) minmax(0,1fr)" }}>
        <Panel title={`Chart · ${selected}`}
               right={snap ? <span className="tabular-nums">{snap.candles.length} bars · 1m</span> : null}
               bodyClassName="overflow-hidden">
          <div className="h-full w-full">
            {snap ? <PriceChart candles={snap.candles} /> :
              <div className="p-4 text-text-mid">awaiting candles…</div>}
          </div>
        </Panel>

        <Panel title="Intelligence Engine"
               right={snap ? <span className="tabular-nums">CPI {(snap.scores.cpi * 100).toFixed(1)}</span> : null}>
          <IntelligencePanel snap={snap} />
        </Panel>

        <Panel title="Live Feeds" bodyClassName="p-2">
          <FeedsPanel feeds={feeds} />
        </Panel>
      </main>
      <footer className="h-6 px-3 border-t border-line bg-bg-1 text-[10px] text-text-mid flex items-center justify-between">
        <span>CPI = (W·SM·V·OI·M) / ((1+R)(1+N)(1+F)(1+L))</span>
        <span>Binance Futures · normalized window 720 · refresh 5s</span>
      </footer>
    </div>
  );
}
