"use client";
import { motion, AnimatePresence } from "framer-motion";
import { CPIGauge } from "./CPIGauge";
import { MetricBar } from "./MetricBar";
import { InteractionMatrix } from "./InteractionMatrix";
import type { SymbolSnapshot } from "@/lib/types";

export function IntelligencePanel({ snap }: { snap?: SymbolSnapshot }) {
  if (!snap) {
    return <div className="p-6 text-text-mid text-sm">awaiting intelligence stream…</div>;
  }
  const s = snap.scores;
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <CPIGauge value={s.cpi} phase={snap.detection.phase} regime={snap.detection.regime} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <MetricBar label="Expansion Probability" value={s.expansion_probability} hint="VOI · momentum · SM" />
          <MetricBar label="Market Stability" value={s.market_stability} hint="inverse of vol+noise+funding" />
          <MetricBar label="Smart Money Confidence" value={s.smart_money_confidence} hint="top trader vs retail" />
          <MetricBar label="Squeeze Probability" value={s.squeeze_probability} hint="funding · liq · OI" />
          <MetricBar label="Accumulation Score" value={s.accumulation_score} hint="quiet flow + outflow" />
          <MetricBar label="Manipulation Risk" value={s.manipulation_risk} hint="noise · funding · liq" />
          <MetricBar label="Volatility Pressure" value={s.volatility_pressure} hint="realized + path noise" />
          <MetricBar label="Momentum Strength" value={s.momentum_strength} hint="|dP/dt| z-scaled" />
        </div>
      </div>

      <InteractionMatrix norm={snap.normalized} inter={snap.interaction} />

      <div className="rounded-md border border-line bg-bg-2/60 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-text-mid">AI Market Interpretation</h3>
          <div className="flex flex-wrap gap-1.5 justify-end">
            {snap.detection.flags.map((f) => (
              <span key={f} className="text-[10px] px-1.5 py-0.5 border border-accent-amber/40
                  bg-accent-amber/10 text-accent-amber rounded uppercase tracking-wider">
                {f.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={snap.narrative}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="text-[12.5px] text-text-hi leading-relaxed"
          >
            {snap.narrative}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
