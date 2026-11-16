"use client";

import { Download, Lock, Megaphone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { LIVE_FEATURE_LABELS, planThatUnlocks, type LiveFeatureKey } from "@/lib/live/features";
import { LIMITS, SLOW_MODE_CHOICES } from "@/lib/live/types";
import { SAAS_PLANS } from "@/services/billing-entitlements";
import { useLiveRoomState } from "./use-live-room";

function Upgrade({ feature }: { feature: LiveFeatureKey }) {
  const plan = SAAS_PLANS[planThatUnlocks(feature)].name;
  return (
    <p className="rounded-xl border border-dashed border-border bg-[#F7F9FC] px-3 py-2 text-xs text-secondaryText">
      <Lock className="mr-1 inline h-3 w-3" aria-hidden />
      {LIVE_FEATURE_LABELS[feature]} comes with the {plan} plan. <a href="/dashboard/billing" className="font-medium text-[#17294B] underline">See plans</a>
    </p>
  );
}

export function HostTools({ slug }: { slug?: string }) {
  const { sync, host } = useLiveRoomState();
  const [announce, setAnnounce] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!sync) return null;
  const f = sync.features;
  const run = async (action: Parameters<typeof host>[0], done: string) => {
    const error = await host(action);
    setMsg(error ? { ok: false, text: error } : { ok: true, text: done });
    return !error;
  };

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 text-sm" data-testid="host-tools">
      {sync.lockedByPlan.length > 0 && (
        <p className="rounded-xl border border-[#F5E1BC] bg-[#FFF8EA] px-3 py-2 text-xs text-[#8A5A0E]">
          You turned on {sync.lockedByPlan.map((k) => LIVE_FEATURE_LABELS[k as LiveFeatureKey] ?? k).join(", ")}, but your plan doesn&apos;t include {sync.lockedByPlan.length === 1 ? "it" : "them"}, so attendees don&apos;t see {sync.lockedByPlan.length === 1 ? "it" : "them"}.
        </p>
      )}

      <section aria-label="Announcement" className="space-y-2">
        <h3 className="flex items-center gap-2 font-semibold text-primaryText"><Megaphone className="h-4 w-4" aria-hidden /> Announcement</h3>
        {f.announcements ? (
          <>
            <div className="flex gap-2">
              <input className="input-field min-w-0 flex-1" placeholder="Shown above the video" aria-label="Announcement text" maxLength={LIMITS.announcement} value={announce} onChange={(e) => setAnnounce(e.target.value)} />
              <button type="button" disabled={!announce.trim()} className="h-11 rounded-2xl bg-[#041B5E] px-3 font-medium text-white disabled:opacity-50 md:h-10" onClick={async () => { if (await run({ type: "announce", text: announce }, "Announcement is live.")) setAnnounce(""); }}>
                Post
              </button>
            </div>
            {sync.room.announcement && (
              <button type="button" className="tap text-xs text-secondaryText underline" onClick={() => void run({ type: "announce", text: null }, "Announcement removed.")}>
                Remove current announcement
              </button>
            )}
          </>
        ) : (
          <Upgrade feature="announcements" />
        )}
      </section>

      <section aria-label="Chat controls" className="space-y-2">
        <h3 className="font-semibold text-primaryText">Chat controls</h3>
        {f.moderationTools ? (
          <div className="space-y-2">
            <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3">
              <span>Pause chat for attendees</span>
              <input type="checkbox" className="h-5 w-5" checked={sync.room.chatLocked} onChange={(e) => void run({ type: "lock", locked: e.target.checked }, e.target.checked ? "Chat paused." : "Chat resumed.")} />
            </label>
            <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3">
              <span>Slow mode</span>
              <select className="rounded-lg border border-border bg-white px-2 py-1.5" value={sync.room.slowModeSeconds} onChange={(e) => void run({ type: "slow", seconds: Number(e.target.value) }, "Slow mode updated.")}>
                {SLOW_MODE_CHOICES.map((s) => <option key={s} value={s}>{s === 0 ? "Off" : `${s} seconds`}</option>)}
              </select>
            </label>
            <p className="text-xs text-secondaryText">Hover a message in Chat to remove it or mute the sender.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-secondaryText">Hover a message in Chat to remove it.</p>
            <Upgrade feature="moderationTools" />
          </>
        )}
      </section>

      <section aria-label="Polls" className="space-y-2">
        <h3 className="font-semibold text-primaryText">Live poll</h3>
        {f.polls ? (
          <div className="space-y-2">
            {sync.poll?.status === "OPEN" && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-[#BFE9E0] bg-[#E9FBF7] px-3 py-2">
                <span className="min-w-0 truncate">Open: {sync.poll.question} ({sync.poll.total} votes)</span>
                <button type="button" className="tap shrink-0 font-medium text-[#17294B] underline" onClick={() => void run({ type: "poll_close", pollId: sync.poll!.id }, "Poll closed.")}>Close</button>
              </div>
            )}
            <input className="input-field" placeholder="Poll question" aria-label="Poll question" maxLength={LIMITS.pollQuestion} value={question} onChange={(e) => setQuestion(e.target.value)} />
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input className="input-field min-w-0 flex-1" placeholder={`Option ${i + 1}`} aria-label={`Option ${i + 1}`} maxLength={LIMITS.pollOption} value={o} onChange={(e) => setOptions((all) => all.map((x, j) => (j === i ? e.target.value : x)))} />
                {options.length > LIMITS.pollOptionsMin && (
                  <button type="button" className="tap-icon rounded-xl text-secondaryText hover:bg-[#EEF5FF]" aria-label={`Remove option ${i + 1}`} onClick={() => setOptions((all) => all.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {options.length < LIMITS.pollOptionsMax && (
                <button type="button" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed border-border px-3 md:min-h-0 md:py-2" onClick={() => setOptions((all) => [...all, ""])}><Plus className="h-4 w-4" /> Add option</button>
              )}
              <button type="button" className="h-11 rounded-2xl bg-[#041B5E] px-4 font-medium text-white md:h-10" onClick={async () => { if (await run({ type: "poll_create", question, options }, "Poll started. Attendees can vote now.")) { setQuestion(""); setOptions(["", ""]); } }}>
                Start poll
              </button>
            </div>
            <p className="text-xs text-secondaryText">Starting a new poll closes the current one.</p>
          </div>
        ) : (
          <Upgrade feature="polls" />
        )}
      </section>

      <section aria-label="Export" className="space-y-2">
        <h3 className="font-semibold text-primaryText">Export</h3>
        {f.transcriptExport && slug ? (
          <a href={`/api/room/${encodeURIComponent(slug)}/export`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 font-medium text-[#17294B] md:min-h-0 md:py-2"><Download className="h-4 w-4" /> Download chat and Q&amp;A (CSV)</a>
        ) : (
          <Upgrade feature="transcriptExport" />
        )}
      </section>

      <p className={`min-h-5 text-xs ${msg?.ok ? "text-[#0F7B52]" : "text-[#B42318]"}`} role="status" aria-live="polite">{msg?.text}</p>
    </div>
  );
}
