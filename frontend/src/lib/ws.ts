"use client";
import { useEffect, useRef } from "react";
import { useStore } from "./store";
import type { WSPayload } from "./types";

/**
 * Live-data hook with three transport modes:
 *
 *   1. WebSocket (preferred)  - if NEXT_PUBLIC_WS_URL is set or a
 *      same-origin /_/backend mount is detected.
 *   2. REST polling            - fallback on Vercel and any platform
 *      that does not support WebSocket.
 *   3. Local in-app API route  - on Vercel the snapshot is computed
 *      by /api/snapshot (Next.js route handler).
 */

const POLL_MS = 5000;

function getApiBase(): string {
  // Explicit override (FastAPI deploy on a separate host)
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;
  if (typeof window === "undefined") return "";
  // Same-origin: API route at /api on Vercel, /_/backend/api when
  // self-hosting alongside FastAPI under a reverse proxy.
  return window.location.origin;
}

function getWsUrl(): string | null {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  // No WS by default - Vercel can't host it. Self-hosters set the env.
  return null;
}

function getSnapshotPath(): string {
  // If user pointed NEXT_PUBLIC_API_BASE at a FastAPI deployment,
  // it exposes /api/snapshot. Same path works for the Next.js
  // route handler in this app.
  return "/api/snapshot";
}

export function useTerminalSocket() {
  const apply = useStore((s) => s.apply);
  const setConnected = useStore((s) => s.setConnected);
  const wsRef = useRef<WebSocket | null>(null);
  const wsRetry = useRef<number | null>(null);
  const pollTimer = useRef<number | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    const API_BASE = getApiBase();
    const WS_URL = getWsUrl();
    const SNAP = `${API_BASE}${getSnapshotPath()}`;

    const fetchSnapshot = async () => {
      try {
        const r = await fetch(SNAP, { cache: "no-store" });
        if (!r.ok) return false;
        const j = await r.json();
        if (cancelled.current) return false;
        apply({ type: "snapshot", data: j.data, feeds: j.feeds } as WSPayload);
        setConnected(true);
        return true;
      } catch {
        setConnected(false);
        return false;
      }
    };

    // ---- polling loop (always available, also our initial paint) ----
    const startPolling = () => {
      if (pollTimer.current) return;
      const tick = async () => {
        if (cancelled.current) return;
        await fetchSnapshot();
        if (cancelled.current) return;
        pollTimer.current = window.setTimeout(tick, POLL_MS);
      };
      tick();
    };

    const stopPolling = () => {
      if (pollTimer.current) {
        window.clearTimeout(pollTimer.current);
        pollTimer.current = null;
      }
    };

    // ---- ws (only if explicitly configured) ----
    const connectWs = () => {
      if (!WS_URL) return;
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;
        ws.onopen = () => {
          setConnected(true);
          stopPolling(); // ws is live, drop polling
        };
        ws.onclose = () => {
          setConnected(false);
          startPolling(); // fallback while we reconnect
          if (cancelled.current) return;
          wsRetry.current = window.setTimeout(connectWs, 3000);
        };
        ws.onerror = () => ws.close();
        ws.onmessage = (e) => {
          try {
            const p = JSON.parse(e.data) as WSPayload;
            apply(p);
          } catch {}
        };
      } catch {
        wsRetry.current = window.setTimeout(connectWs, 3000);
      }
    };

    // Start polling immediately. If a WS URL is set, try to upgrade.
    startPolling();
    connectWs();

    return () => {
      cancelled.current = true;
      stopPolling();
      if (wsRetry.current) window.clearTimeout(wsRetry.current);
      wsRef.current?.close();
    };
  }, [apply, setConnected]);
}
