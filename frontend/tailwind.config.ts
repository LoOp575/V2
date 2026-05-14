import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      colors: {
        // institutional dark palette
        bg: { 0: "#05070A", 1: "#0A0E14", 2: "#0F141B", 3: "#141B25" },
        line: "#1B2430",
        text: { hi: "#E5ECF4", mid: "#8B97A8", lo: "#5B6677" },
        accent: {
          cyan: "#22D3EE",
          green: "#22C55E",
          amber: "#F59E0B",
          red: "#EF4444",
          violet: "#8B5CF6",
        },
      },
      boxShadow: {
        panel: "0 0 0 1px #1B2430, 0 8px 24px rgba(0,0,0,.45)",
      },
    },
  },
  plugins: [],
};
export default config;
