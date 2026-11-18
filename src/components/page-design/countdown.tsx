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
      <p className="mx-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold" style={{ background: accent, color: "#101B35" }}>
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
    <div className="mx-auto grid w-full max-w-[20rem] grid-cols-4 gap-1.5 sm:max-w-md sm:gap-3" role="timer" aria-label="Time until the session starts">
      {parts.map((part) => (
        <div key={part.label} className="min-w-0 rounded-xl border tint-border tint-soft px-1 py-2.5 text-center sm:rounded-2xl sm:px-3 sm:py-3">
          <div className="text-[clamp(1.125rem,6vw,1.5rem)] font-semibold leading-none tabular-nums sm:text-3xl">{part.value === null ? "--" : String(part.value).padStart(2, "0")}</div>
          <div className="mt-1.5 text-[9px] uppercase tracking-[0.06em] opacity-70 min-[360px]:text-[10px] sm:text-[11px] sm:tracking-[0.12em]">{part.label}</div>
        </div>
      ))}
    </div>
  );
}
