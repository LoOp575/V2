/**
 * GET /api/snapshot
 *
 * Single endpoint that returns the full intelligence snapshot for
 * all configured symbols. Vercel runs this as a serverless function;
 * the client polls it on an interval (see src/lib/ws.ts).
 *
 * Symbols are configurable via NEXT_PUBLIC_SYMBOLS or SYMBOLS.
 */
import { NextResponse } from "next/server";
import { buildFullSnapshot } from "@/server/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

function getSymbols(): string[] {
  const raw = process.env.SYMBOLS || process.env.NEXT_PUBLIC_SYMBOLS;
  if (!raw) return DEFAULT_SYMBOLS;
  return raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
}

export async function GET() {
  try {
    const symbols = getSymbols();
    const snap = await buildFullSnapshot(symbols);
    return NextResponse.json(snap, {
      headers: {
        // Vercel CDN edge cache: 4s, stale-while-revalidate 30s
        "Cache-Control": "public, s-maxage=4, stale-while-revalidate=30",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "snapshot failed" },
      { status: 500 },
    );
  }
}
