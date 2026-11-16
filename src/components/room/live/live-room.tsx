"use client";

import { Megaphone, Radio, Users, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { REACTION_EMOJI } from "@/lib/live/types";
import { LiveRoomProvider, useLiveRoom, useLiveRoomState, type LiveRoomOptions } from "./use-live-room";

/** Wraps the room so the video overlay, the status bar and the side panel share one live connection. */
export function LiveRoom({ options, children }: { options: LiveRoomOptions; children: ReactNode }) {
  const state = useLiveRoom(options);
  return <LiveRoomProvider value={state}>{children}</LiveRoomProvider>;
}

/** Emoji floating up over the video, like a live stream. */
export function ReactionOverlay() {
  const { bursts, endBurst } = useLiveRoomState();
  if (!bursts.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bursts.map((b) => (
        <span key={b.key} className="live-float absolute bottom-2 text-2xl sm:text-3xl" style={{ left: `${b.left}%`, animationDelay: `${b.delay}ms` }} onAnimationEnd={() => endBurst(b.key)}>
          {b.emoji}
        </span>
      ))}
    </div>
  );
}

/** Live badge, viewer count and reaction buttons under the video. */
export function LiveStatusBar({ liveLabel }: { liveLabel: string }) {
  const { sync, react } = useLiveRoomState();
  const features = sync?.features;
  const viewers = sync?.viewers;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDECEC] px-2.5 py-1 text-xs font-semibold text-[#B42318]">
          <span className="live-dot h-2 w-2 rounded-full bg-[#E5484D]" aria-hidden />
          {liveLabel}
        </span>
        {features?.viewerCount && typeof viewers === "number" && (
          <span className="inline-flex items-center gap-1.5 text-secondaryText" data-testid="viewer-count">
            <Users className="h-4 w-4" aria-hidden />
            <span>
              <strong className="font-semibold text-primaryText">{viewers.toLocaleString()}</strong> watching
            </span>
          </span>
        )}
      </div>
      {features?.reactions && (
        <div className="flex items-center gap-1.5" role="group" aria-label="Send a reaction">
          {REACTION_EMOJI.map((emoji) => (
            <button key={emoji} type="button" onClick={() => react(emoji)} className="live-tap inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-xl shadow-sm transition-transform hover:scale-110 active:scale-90 md:h-10 md:w-10" aria-label={`React ${emoji}`}>
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** The host's announcement, shown above the video until the viewer dismisses it. */
export function AnnouncementBanner() {
  const { sync } = useLiveRoomState();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const text = sync?.room.announcement;
  const at = sync?.room.announcementAt ?? "";
  if (!text || dismissed === at) return null;
  return (
    <div className="live-pop mb-3 flex items-start gap-3 rounded-2xl border border-[#BFE9E0] bg-gradient-to-r from-[#E9FBF7] to-[#EEF5FF] px-4 py-3 text-sm text-primaryText" role="status" data-testid="announcement">
      <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-[#0A7F6B]" aria-hidden />
      <p className="min-w-0 flex-1 break-words">{text}</p>
      <button type="button" onClick={() => setDismissed(at)} className="tap-icon -mr-2 -mt-1.5 rounded-full text-secondaryText hover:bg-white/70 md:-mt-1" aria-label="Dismiss announcement">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function LiveUnavailable({ message }: { message: string }) {
  return (
    <div className="rounded-[2rem] border border-border bg-white p-5 text-sm text-secondaryText shadow-soft">
      <div className="mb-1 flex items-center gap-2 font-medium text-primaryText">
        <Radio className="h-4 w-4 text-secondaryText" aria-hidden /> Live interaction
      </div>
      {message}
    </div>
  );
}
