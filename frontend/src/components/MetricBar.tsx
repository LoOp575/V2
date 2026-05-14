"use client";

const palette = [
  { stop: 0.33, color: "#22C55E" }, // calm
  { stop: 0.66, color: "#F59E0B" },
  { stop: 1.01, color: "#EF4444" }, // hot
];

function colorFor(v: number) {
  const x = Math.max(0, Math.min(1, v));
  for (const p of palette) if (x <= p.stop) return p.color;
  return "#EF4444";
}

export function MetricBar({
  label, value, hint, invert = false,
}: { label: string; value: number; hint?: string; invert?: boolean }) {
  const v = Math.max(0, Math.min(1, value));
  const display = invert ? 1 - v : v;
  const color = colorFor(display);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-text-mid uppercase tracking-wider">{label}</span>
        <span className="tabular-nums text-text-hi">{(v * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-sm bg-bg-3 overflow-hidden">
        <div
          className="h-full transition-[width] duration-500 ease-out"
          style={{ width: `${v * 100}%`, background: color, boxShadow: `0 0 12px ${color}66` }}
        />
      </div>
      {hint && <div className="text-[10px] text-text-lo">{hint}</div>}
    </div>
  );
}
