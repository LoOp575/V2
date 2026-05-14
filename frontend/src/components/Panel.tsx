"use client";
import { ReactNode } from "react";

export function Panel({
  title,
  right,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`rounded-md bg-bg-1 shadow-panel flex flex-col min-h-0 ${className}`}>
      <header className="flex items-center justify-between px-3 h-9 border-b border-line">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-text-mid">{title}</h2>
        <div className="text-[11px] text-text-mid">{right}</div>
      </header>
      <div className={`flex-1 min-h-0 overflow-auto scrollbar-thin ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
}
