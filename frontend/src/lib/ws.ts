"use client";
import { useEffect, useRef } from "react";
import { useStore } from "./store";
import type { WSPayload } from "./types";

/**
 * Resolve backend URLs.
 * Supports:
 *  - Explicit env vars (NEXT_PUBLIC_API_BASE / NEXT_PUBLIC_WS_URL)
 *  - Platform routing with experimentalServices (backend at /_/backend)
 *  - Local dev fallback (localhost:8000)
 */
function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;
  if (typeof window === "undefined") return "http://localhost:8000";
  // Platform deploy: backend is at same origin under /_/backend
  return `${window.location.origin}/_/backend`;
}

function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window === "undefined") return "ws://localhost:8000/api/ws";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/_/backend/api/ws`;
}

export function useTerminalSocket() {
  const apply = useStore((s) => s.apply);
  const setConnected = useStore((s) => s.setConnected);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const API_BASE = getApiBase();
    const WS_URL = getWsUrl();

    // initial REST snapshot - lets us paint immediately
    fetch(`${API_BASE}/api/snapshot`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && !cancelled) apply({ type: "snapshot", data: j.data, feeds: j.feeds });
      })
      .catch(() => {});

    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;
        ws.onopen = () => setConnected(true);
        ws.onclose = () => {
          setConnected(false);
          retryRef.current = window.setTimeout(connect, 2000);
        };
        ws.onerror = () => ws.close();
        ws.onmessage = (e) => {
          try {
            const p = JSON.parse(e.data) as WSPayload;
            apply(p);
          } catch {}
        };
      } catch {
        retryRef.current = window.setTimeout(connect, 2000);
      }
    };
    connect();

    return () => {
      cancelled = true;
      if (retryRef.current) window.clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [apply, setConnected]);
}
