"use client";
import { create } from "zustand";
import type { Feeds, SymbolSnapshot, WSPayload } from "./types";

interface State {
  connected: boolean;
  selected: string;
  symbols: string[];
  data: Record<string, SymbolSnapshot>;
  feeds: Feeds;
  setConnected: (c: boolean) => void;
  setSelected: (s: string) => void;
  apply: (p: WSPayload) => void;
}

export const useStore = create<State>((set) => ({
  connected: false,
  selected: "BTCUSDT",
  symbols: [],
  data: {},
  feeds: { whale: [], liquidation: [], funding: [], smart_money: [], exchange_flow: [] },
  setConnected: (connected) => set({ connected }),
  setSelected: (selected) => set({ selected }),
  apply: (p) =>
    set((s) => {
      if (p.type !== "snapshot" || !p.data) return s;
      const symbols = Object.keys(p.data);
      return {
        ...s,
        data: p.data,
        feeds: p.feeds ?? s.feeds,
        symbols,
        selected: symbols.includes(s.selected) ? s.selected : symbols[0] ?? s.selected,
      };
    }),
}));
