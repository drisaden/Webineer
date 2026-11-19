"use client";

import { Ban, ExternalLink, PlayCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getVideoProvider } from "@/providers/video";
import { buildPlayerUrl, WORKFLOW_VIDEO_PROVIDERS } from "@/lib/webinar-workflow/video";
import { errorFor, IssueSummary, Notice, NumberInput, SectionCard, SelectInput, TextArea, TextInput, Toggle } from "../form-controls";
import type { SectionProps } from "../section-types";

export function ReplaySection({ draft, update, issues, showErrors, goTo, context }: SectionProps) {
  const r = draft.replay;
  const set = <K extends keyof typeof r>(key: K, value: (typeof r)[K]) => update("replay", { ...r, [key]: value });
  const source = r.useLiveVideo ? draft.integrations.video : r.video;
  const playerUrl = buildPlayerUrl(source.provider, source.url);

  return (
    <div className="space-y-5">
      <div role="radiogroup" aria-label="Replay" className="grid gap-3 md:grid-cols-2">
        {[
          { value: false, title: "Disable replay", text: "The replay page shows an unavailable message, including via direct links.", icon: Ban },
          { value: true, title: "Enable replay", text: "Registrants can watch a recording you provide, with access rules.", icon: RotateCcw },
        ].map((option) => {
          const selected = r.enabled === option.value;
          const Icon = option.icon;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => set("enabled", option.value)}
              className={cn(
                "flex items-start gap-3 rounded-2xl border-2 bg-white p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0AEBCB]/60",
                selected ? "border-[#041B5E] bg-[#EEF5FF]" : "border-border hover:border-[#9FB3D1]",
              )}
            >
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", selected ? "bg-[#041B5E] text-white" : "bg-[#EAFBF5] text-[#0F7B52]")}>
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-primaryText">{option.title}</span>
                <span className="mt-1 block text-xs text-secondaryText">{option.text}</span>
              </span>
            </button>
          );
        })}
      </div>

      {r.enabled && (
        <>
          <SectionCard title="Recording" description="Webineer doesn’t record sessions automatically. Point to a recording hosted on a supported provider." icon={<PlayCircle className="h-4 w-4" />}>
            <Toggle label="Use the webinar video" description="Reuse the video configured under Integrations (useful for pre-recorded webinars)." checked={r.useLiveVideo} onChange={(v) => set("useLiveVideo", v)} />
            {r.useLiveVideo ? (
              !draft.integrations.video.url && (
                <Notice tone="warning">
                  No webinar video is set.{" "}
                  <button type="button" className="font-medium underline" onClick={() => goTo("integrations")}>
                    Add one in Integrations
                  </button>
                </Notice>
              )
            ) : (
              <div className="grid gap-5 md:grid-cols-[1fr_2fr]">
                <SelectInput label="Provider" value={r.video.provider} onChange={(v) => set("video", { ...r.video, provider: v })} options={WORKFLOW_VIDEO_PROVIDERS.map((id) => ({ value: id, label: getVideoProvider(id).label }))} />
                <TextInput label="Recording URL" value={r.video.url} onChange={(v) => set("video", { ...r.video, url: v.trim() })} placeholder="https://" error={errorFor(issues, "video.url", showErrors)} />
              </div>
            )}
            {playerUrl && getVideoProvider(source.provider).supportsEmbed && (
              <div className="overflow-hidden rounded-2xl border border-border bg-[#101B35]">
                <div className="aspect-video">
                  <iframe src={playerUrl} title="Replay preview" className="h-full w-full" allow="fullscreen; picture-in-picture; encrypted-media" allowFullScreen />
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Replay page" icon={<RotateCcw className="h-4 w-4" />}>
            <TextInput label="Replay title" optional value={r.title} onChange={(v) => set("title", v)} placeholder={`${draft.configuration.title || "Webinar"} — replay`} maxLength={150} />
            <TextArea label="Replay description" optional value={r.description} onChange={(v) => set("description", v)} rows={3} maxLength={2000} />
            {context.slug && (
              <Button asChild variant="secondary" size="sm">
                <a href={`/replay/${context.slug}?preview=host`} target="_blank" rel="noopener">
                  Preview replay page <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
          </SectionCard>

          <SectionCard title="Access & availability" icon={<Ban className="h-4 w-4" />}>
            <SelectInput
              label="Who can watch"
              value={r.access}
              onChange={(v) => set("access", v)}
              error={errorFor(issues, "access", showErrors)}
              options={[
                { value: "all_registrants", label: "All registered attendees" },
                { value: "attended_only", label: "Only registrants marked as attended" },
                { value: "paid_only", label: "Only registrants with a verified payment" },
                { value: "anyone_with_link", label: "Anyone with the replay link" },
              ]}
            />
            <SelectInput
              label="Available"
              value={r.availability}
              onChange={(v) => set("availability", v)}
              options={[
                { value: "after_session", label: "After the session ends" },
                { value: "immediately", label: "Immediately" },
              ]}
            />
            <SelectInput
              label="Expires"
              value={r.expiration}
              onChange={(v) => set("expiration", v)}
              options={[
                { value: "never", label: "Never" },
                { value: "date", label: "On a specific date" },
                { value: "days_after", label: "A number of days after the session" },
              ]}
            />
            {r.expiration === "date" && <TextInput label="Expiry date" type="date" value={r.expiresOn} onChange={(v) => set("expiresOn", v)} hint={`End of day in ${draft.schedules.timezone}`} error={errorFor(issues, "expiresOn", showErrors)} />}
            {r.expiration === "days_after" && <NumberInput label="Expire after" value={r.expiresAfterDays} onChange={(v) => set("expiresAfterDays", Math.min(365, Math.max(1, Math.round(v))))} min={1} max={365} suffix="days" />}
          </SectionCard>

          <SectionCard title="Sell the replay" description="Charge for the recording. Payments go to your earnings with the same platform fee as tickets." icon={<RotateCcw className="h-4 w-4" />}>
            <Toggle
              label="Charge for the replay"
              checked={Boolean(r.sales?.enabled)}
              onChange={(v) => set("sales", { price: r.sales?.price ?? 0, currency: r.sales?.currency ?? draft.integrations.payment.currency, freeForTicketHolders: r.sales?.freeForTicketHolders ?? true, enabled: v })}
            />
            {r.sales?.enabled && (
              <>
                <div className="grid gap-5 md:grid-cols-2">
                  <NumberInput label="Replay price" value={r.sales.price} min={0} step={100} onChange={(v) => set("sales", { ...r.sales!, price: Math.max(0, Math.round(v * 100) / 100) })} error={errorFor(issues, "sales.price", showErrors)} />
                  <SelectInput
                    label="Currency"
                    value={r.sales.currency}
                    onChange={(v) => set("sales", { ...r.sales!, currency: v })}
                    options={[
                      { value: "NGN", label: "NGN — Nigerian naira" },
                      { value: "USD", label: "USD — US dollar" },
                      { value: "GBP", label: "GBP — British pound" },
                      { value: "EUR", label: "EUR — Euro" },
                    ]}
                  />
                </div>
                <Toggle label="Free for people who paid for the live ticket" description="Only applies when this webinar charges for registration." checked={r.sales.freeForTicketHolders} onChange={(v) => set("sales", { ...r.sales!, freeForTicketHolders: v })} />
                {!context.payment.live && <Notice tone="warning">Replay sales need online payments. They only work on the live site with payments set up.</Notice>}
              </>
            )}
          </SectionCard>

          <Notice>
            Replay notification email:{" "}
            <strong>{draft.notifications.replayEmail.enabled ? "on" : "off"}</strong>.{" "}
            <button type="button" className="font-medium underline" onClick={() => goTo("notifications")}>
              Edit in Notifications
            </button>
          </Notice>
        </>
      )}
      <IssueSummary issues={issues} show={showErrors} />
    </div>
  );
}
