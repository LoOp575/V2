"use client";
import { ago, fmtPct } from "@/lib/format";
import type { Feeds } from "@/lib/types";

export function FeedsPanel({ feeds }: { feeds: Feeds }) {
  return (
    <div className="grid grid-rows-5 gap-2 h-full">
      <FeedBlock title="Whale Flow" rows={[...feeds.whale].reverse()}
        render={(r) => (
          <Row
            ts={r.ts}
            left={r.symbol}
            mid={<span className={r.direction === "OUTFLOW" ? "text-accent-green" : "text-accent-amber"}>{r.direction}</span>}
            right={`${(r.intensity * 100).toFixed(0)}%`}
          />
        )}
      />
      <FeedBlock title="Liquidation Pressure" rows={[...feeds.liquidation].reverse()}
        render={(r) => (
          <Row
            ts={r.ts}
            left={r.symbol}
            mid={<span className={r.side === "LONGS" ? "text-accent-red" : r.side === "SHORTS" ? "text-accent-green" : "text-text-mid"}>{r.side}</span>}
            right={`${(r.pressure * 100).toFixed(0)}%`}
          />
        )}
      />
      <FeedBlock title="Funding Monitor" rows={[...feeds.funding].reverse()}
        render={(r) => (
          <Row
            ts={r.ts}
            left={r.symbol}
            mid={<span className={r.rate >= 0 ? "text-accent-green" : "text-accent-red"}>{fmtPct(r.rate, 4)}</span>}
            right={`${(r.score * 100).toFixed(0)}%`}
          />
        )}
      />
      <FeedBlock title="Smart Money Alerts" rows={[...feeds.smart_money].reverse()}
        render={(r) => (
          <Row
            ts={r.ts}
            left={r.symbol}
            mid={<span className={r.bias === "LONG" ? "text-accent-green" : "text-accent-red"}>{r.bias}</span>}
            right={`${(r.score * 100).toFixed(0)}%`}
          />
        )}
      />
      <FeedBlock title="Exchange Flow" rows={[...feeds.exchange_flow].reverse()}
        render={(r) => (
          <Row
            ts={r.ts}
            left={r.symbol}
            mid={<span className={r.direction === "OUTFLOW" ? "text-accent-green" : "text-accent-amber"}>{r.direction}</span>}
            right={`${(r.flow * 100).toFixed(0)}%`}
          />
        )}
      />
    </div>
  );
}

function FeedBlock<T>({
  title, rows, render,
}: { title: string; rows: T[]; render: (r: any) => React.ReactNode }) {
  return (
    <section className="rounded-md bg-bg-1 shadow-panel min-h-0 flex flex-col">
      <header className="h-7 px-3 flex items-center border-b border-line">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-text-mid">{title}</h3>
      </header>
      <ul className="flex-1 overflow-auto scrollbar-thin">
        {rows.length === 0 ? (
          <li className="px-3 py-2 text-[11px] text-text-lo">no events</li>
        ) : (
          rows.slice(0, 30).map((r: any, i) => (
            <li key={i} className="px-3 py-1.5 border-b border-line/40 text-[11px]">
              {render(r)}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function Row({ ts, left, mid, right }: { ts: number; left: string; mid: React.ReactNode; right: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-text-mid w-10">{ago(ts)}</span>
      <span className="text-text-hi w-20">{left}</span>
      <span className="flex-1 text-center">{mid}</span>
      <span className="tabular-nums text-text-mid w-12 text-right">{right}</span>
    </div>
  );
}
