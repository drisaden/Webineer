"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Countdown } from "@/components/page-design/countdown";

function subscribe(callback: () => void) {
  const timer = window.setInterval(callback, 1000);
  return () => window.clearInterval(timer);
}

/**
 * The room's main stage. Attendees can enter a little early, but the video only appears at the
 * scheduled start: until then they see a countdown, and the stage switches over by itself.
 */
export function RoomStage({
  title,
  startsAt,
  startedOnServer,
  alwaysOpen,
  startLabel,
  liveLabel,
  overlay,
  children,
}: {
  title: string;
  startsAt: string;
  /** Whether the session had started when the page was rendered (keeps server and first client render identical). */
  startedOnServer: boolean;
  /** Hosts previewing the room always see the video. */
  alwaysOpen: boolean;
  startLabel: string;
  liveLabel: string;
  /** Drawn over the video once it is playing (floating reactions). */
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const target = new Date(startsAt).getTime();
  const started = useSyncExternalStore(
    subscribe,
    () => alwaysOpen || Date.now() >= target,
    () => alwaysOpen || startedOnServer,
  );
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3 px-3 pt-2">
        <h2 className="truncate text-lg text-primaryText">{title}</h2>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${started ? "bg-[#EAFBF5] text-[#0F7B52]" : "bg-[#FFF8EA] text-[#8A5A0E]"}`} data-room-state={started ? "live" : "waiting"}>
          {started ? liveLabel : "Starting soon"}
        </span>
      </div>
      <div className="overflow-hidden rounded-[1.5rem] border border-border bg-[#101B35]">
        <div className="relative aspect-video w-full bg-[#111C2E]">
          {started ? (
            <>
              {children}
              {overlay}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-white">
              <p className="text-sm uppercase tracking-[0.15em] text-white/70">You&apos;re in. The session starts in</p>
              <Countdown startsAt={startsAt} accent="#16D6B2" liveLabel="Starting…" />
              <p className="text-sm text-white/70">{startLabel}</p>
              <p className="max-w-sm text-xs text-white/50">Keep this page open. The video appears here automatically at the start time.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
