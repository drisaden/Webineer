"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const timer = window.setInterval(callback, 1000);
  return () => window.clearInterval(timer);
}

/** Live countdown to the session start. Renders nothing meaningful on the server (the visitor's clock decides). */
export function Countdown({ startsAt, accent, liveLabel = "Happening now" }: { startsAt: string; accent: string; liveLabel?: string }) {
  const target = new Date(startsAt).getTime();
  // Whole seconds remaining, so the snapshot is stable between ticks.
  const remaining = useSyncExternalStore(
    subscribe,
    () => Math.max(0, Math.floor((target - Date.now()) / 1000)),
    () => -1,
  );
  if (!Number.isFinite(target)) return null;
  if (remaining === 0) {
    return (
      <p className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold" style={{ background: accent, color: "#101B35" }}>
        <span className="h-2 w-2 animate-pulse rounded-full bg-current" aria-hidden /> {liveLabel}
      </p>
    );
  }
  const parts = [
    { label: "Days", value: remaining < 0 ? null : Math.floor(remaining / 86400) },
    { label: "Hours", value: remaining < 0 ? null : Math.floor((remaining % 86400) / 3600) },
    { label: "Minutes", value: remaining < 0 ? null : Math.floor((remaining % 3600) / 60) },
    { label: "Seconds", value: remaining < 0 ? null : remaining % 60 },
  ];
  return (
    <div className="inline-grid grid-cols-4 gap-2 sm:gap-3" role="timer" aria-label="Time until the session starts">
      {parts.map((part) => (
        <div key={part.label} className="min-w-[4rem] rounded-2xl border tint-border tint-soft px-3 py-3 text-center">
          <div className="text-2xl font-semibold tabular-nums sm:text-3xl">{part.value === null ? "--" : String(part.value).padStart(2, "0")}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.12em] opacity-70">{part.label}</div>
        </div>
      ))}
    </div>
  );
}
