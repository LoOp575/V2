"use client";
import { useEffect, useRef } from "react";
import {
  createChart, ColorType, IChartApi, ISeriesApi, CrosshairMode, UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/types";

export function PriceChart({ candles }: { candles: Candle[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0A0E14" },
        textColor: "#8B97A8",
        fontFamily: "ui-monospace, Menlo, monospace",
      },
      grid: {
        vertLines: { color: "#141B25" },
        horzLines: { color: "#141B25" },
      },
      rightPriceScale: { borderColor: "#1B2430" },
      timeScale: { borderColor: "#1B2430", timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
    });
    const candle = chart.addCandlestickSeries({
      upColor: "#22C55E", downColor: "#EF4444",
      borderUpColor: "#22C55E", borderDownColor: "#EF4444",
      wickUpColor: "#22C55E", wickDownColor: "#EF4444",
    });
    const vol = chart.addHistogramSeries({
      priceScaleId: "",
      priceFormat: { type: "volume" },
      color: "#22D3EE",
    });
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    chartRef.current = chart;
    candleRef.current = candle;
    volRef.current = vol;
    return () => { chart.remove(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    if (!candleRef.current || !volRef.current) return;
    if (!candles?.length) return;
    candleRef.current.setData(candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open, high: c.high, low: c.low, close: c.close,
    })));
    volRef.current.setData(candles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? "rgba(34,197,94,0.55)" : "rgba(239,68,68,0.55)",
    })));
  }, [candles]);

  return <div ref={ref} className="w-full h-full" />;
}
