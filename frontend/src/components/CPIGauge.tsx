"use client";
import { motion } from "framer-motion";

export function CPIGauge({ value, phase, regime }: {
  value: number;
  phase: string;
  regime: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  const angle = -120 + v * 240;            // -120deg .. +120deg sweep
  const color =
    v < 0.33 ? "#22C55E" : v < 0.66 ? "#F59E0B" : "#EF4444";

  // SVG arc background -- 240deg arc centered at top
  const r = 78;
  const cx = 100, cy = 100;
  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180);
  const a1 = toRad(-120), a2 = toRad(120);
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
  const arc = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;

  // progress arc length
  const ax2 = cx + r * Math.cos(toRad(-120 + v * 240));
  const ay2 = cy + r * Math.sin(toRad(-120 + v * 240));
  const largeFlag = v > 0.5 ? 1 : 0;
  const progArc = `M ${x1} ${y1} A ${r} ${r} 0 ${largeFlag} 1 ${ax2} ${ay2}`;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 140" className="w-full max-w-[260px]">
        <path d={arc} stroke="#1B2430" strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d={progArc} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        <motion.g
          initial={false}
          animate={{ rotate: angle }}
          style={{ originX: `${cx}px`, originY: `${cy}px` }}
        >
          <line
            x1={cx} y1={cy} x2={cx} y2={cy - r + 8}
            stroke={color} strokeWidth="2" strokeLinecap="round"
          />
        </motion.g>
        <circle cx={cx} cy={cy} r={5} fill={color} />
      </svg>
      <div className="text-3xl tabular-nums font-semibold mt-1" style={{ color }}>
        {(v * 100).toFixed(1)}
      </div>
      <div className="text-[10px] uppercase tracking-[0.25em] text-text-mid">CPI Index</div>
      <div className="mt-3 flex gap-2">
        <Pill label={phase} tone={phaseTone(phase)} />
        <Pill label={regime.replace("_", " ")} tone="neutral" />
      </div>
    </div>
  );
}

function phaseTone(p: string): "good" | "warn" | "bad" | "neutral" {
  if (p === "ACCUMULATION" || p === "EXPANSION") return "good";
  if (p === "DISTRIBUTION") return "warn";
  if (p === "TRAP") return "bad";
  return "neutral";
}

function Pill({ label, tone }: { label: string; tone: "good" | "warn" | "bad" | "neutral" }) {
  const map = {
    good: "border-accent-green/50 text-accent-green bg-accent-green/10",
    warn: "border-accent-amber/50 text-accent-amber bg-accent-amber/10",
    bad: "border-accent-red/50 text-accent-red bg-accent-red/10",
    neutral: "border-line text-text-mid bg-bg-2",
  } as const;
  return (
    <span className={`text-[10px] uppercase tracking-widest px-2 py-1 border rounded ${map[tone]}`}>
      {label}
    </span>
  );
}
