"use client";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // surface error details to the browser console
    // so the deploy platform's logs capture them
    // eslint-disable-next-line no-console
    console.error("Terminal crashed:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
      <h1 className="text-accent-red text-sm uppercase tracking-[0.3em]">
        Terminal Error
      </h1>
      <pre className="max-w-2xl whitespace-pre-wrap text-[12px] text-text-mid bg-bg-2 p-4 rounded border border-line">
        {error?.message || "Unknown error"}
        {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
      </pre>
      <button
        onClick={reset}
        className="text-[11px] uppercase tracking-widest px-3 py-1.5 border border-accent-cyan/60 text-accent-cyan hover:bg-accent-cyan/10 rounded"
      >
        Retry
      </button>
    </div>
  );
}
