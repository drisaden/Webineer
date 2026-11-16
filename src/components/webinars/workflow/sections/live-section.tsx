"use client";

import { DoorOpen, ExternalLink, MessageSquareText, MousePointerClick, Radio, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIVE_FEATURE_LABELS, livePlanFeatures, planThatUnlocks, type LiveFeatureKey } from "@/lib/live/features";
import { SAAS_PLANS } from "@/services/billing-entitlements";
import { errorFor, IssueSummary, Notice, NumberInput, SectionCard, SelectInput, TextInput, Toggle, UnavailableBadge } from "../form-controls";
import type { SectionProps } from "../section-types";

export function LiveSection({ draft, update, issues, showErrors, goTo, context }: SectionProps) {
  const l = draft.live;
  const set = <K extends keyof typeof l>(key: K, value: (typeof l)[K]) => update("live", { ...l, [key]: value });
  const paid = draft.integrations.payment.enabled;
  const entitled = livePlanFeatures(context.livePlan);
  const interactionRows: { key: "chatEnabled" | "qaEnabled" | "pollsEnabled" | "reactionsEnabled" | "viewerCountEnabled"; plan: LiveFeatureKey; label: string; description: string; value: boolean }[] = [
    { key: "chatEnabled", plan: "chat", label: "Live chat", description: "Attendees chat with each other and the host, starting when they enter the room.", value: l.chatEnabled },
    { key: "viewerCountEnabled", plan: "viewerCount", label: "Viewer count", description: "Show how many people are watching right now.", value: l.viewerCountEnabled !== false },
    { key: "reactionsEnabled", plan: "reactions", label: "Reactions", description: "Emoji that float up over the video.", value: l.reactionsEnabled !== false },
    { key: "qaEnabled", plan: "qa", label: "Questions and answers", description: "Attendees ask questions and you mark them answered.", value: l.qaEnabled },
    { key: "pollsEnabled", plan: "polls", label: "Live polls", description: "Start a poll during the session and show results as people vote.", value: l.pollsEnabled !== false },
  ];
  return (
    <div className="space-y-5">
      <SectionCard title="Webinar room" description="The attendee room shows your external video with the webinar title, description and presenters." icon={<Radio className="h-4 w-4" />}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-[#F7F9FC] p-3 text-sm">
          <span className="min-w-0 truncate text-secondaryText">
            Video: <span className="font-medium text-primaryText">{draft.integrations.video.url || "not set"}</span>
          </span>
          <button type="button" className="font-medium text-[#17294B] underline" onClick={() => goTo("integrations")}>
            Change video
          </button>
        </div>
        <Toggle label="Show webinar description" checked={l.showDescription} onChange={(v) => set("showDescription", v)} />
        <Toggle label="Show presenters" checked={l.showPresenters} onChange={(v) => set("showPresenters", v)} />
        {context.slug && (
          <Button asChild variant="secondary" size="sm">
            <a href={`/room/${context.slug}?preview=host`} target="_blank" rel="noopener">
              Open room as host <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        )}
      </SectionCard>

      <SectionCard title="Access" description="Who can enter the room and when." icon={<ShieldCheck className="h-4 w-4" />}>
        <SelectInput
          label="Who can enter"
          value={l.access}
          onChange={(v) => set("access", v)}
          options={[
            { value: "registered", label: paid ? "Registrants with a verified payment (personal link)" : "Registered attendees only (personal link)" },
            { value: "anyone_with_link", label: "Anyone with the room link" },
          ]}
          error={errorFor(issues, "access", showErrors)}
        />
        {paid && <Notice>Paid webinars always require a verified payment. Unpaid or pending registrations cannot enter.</Notice>}
        <div className="grid gap-5 md:grid-cols-2">
          <NumberInput label="Room opens before start" value={l.entryOpensMinutesBefore} onChange={(v) => set("entryOpensMinutesBefore", Math.min(240, Math.max(0, Math.round(v))))} min={0} max={240} suffix="minutes" />
          <NumberInput label="Late-join cutoff" value={l.lateJoinCutoffMinutes} onChange={(v) => set("lateJoinCutoffMinutes", Math.max(0, Math.round(v)))} min={0} suffix="minutes after start" hint={l.allowLateJoin ? undefined : "Late join is off"} />
        </div>
        <Toggle label="Allow late join" description="Let attendees enter after the session has started, until the cutoff." checked={l.allowLateJoin} onChange={(v) => set("allowLateJoin", v)} />
        {draft.configuration.mode === "always_on" && <p className="text-xs text-secondaryText">Always-on rooms are available on demand; entry windows apply to each registrant’s session.</p>}
      </SectionCard>

      <SectionCard title="Attendee interaction" icon={<MessageSquareText className="h-4 w-4" />}>
        <p className="text-sm text-secondaryText">What attendees can do in the room. Features outside your {SAAS_PLANS[context.livePlan].name} plan are marked, and attendees won&apos;t see them.</p>
        {interactionRows.map((row) => {
          const allowed = entitled[row.plan];
          return (
            <Toggle
              key={row.key}
              label={row.label}
              description={row.description}
              checked={allowed && row.value}
              disabled={!allowed}
              onChange={(v) => set(row.key, v)}
              badge={allowed ? undefined : <UnavailableBadge label={`${SAAS_PLANS[planThatUnlocks(row.plan)].name} plan`} />}
            />
          );
        })}
        <div className="rounded-xl border border-border bg-[#F7F9FC] p-3 text-xs text-secondaryText">
          <p className="mb-1 font-medium text-primaryText">Host tools included in your plan</p>
          <ul className="space-y-0.5">
            {(["announcements", "moderationTools", "transcriptExport"] as LiveFeatureKey[]).map((key) => (
              <li key={key}>
                {entitled[key] ? "✓" : "✗"} {LIVE_FEATURE_LABELS[key]}
                {!entitled[key] && <span> (from {SAAS_PLANS[planThatUnlocks(key)].name})</span>}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-secondaryText">Open the room as host to post announcements, run polls and answer questions while you&apos;re live. Chat updates every few seconds.</p>
      </SectionCard>

      <SectionCard title="Call to action" description="A button shown in the room, e.g. to an offer or booking page." icon={<MousePointerClick className="h-4 w-4" />}>
        <Toggle label="Show a call-to-action button" checked={l.cta.enabled} onChange={(v) => set("cta", { ...l.cta, enabled: v })} />
        {l.cta.enabled && (
          <div className="grid gap-5 md:grid-cols-3">
            <TextInput label="Button label" value={l.cta.label} onChange={(v) => set("cta", { ...l.cta, label: v })} maxLength={60} error={errorFor(issues, "cta.label", showErrors)} />
            <TextInput label="Button URL" value={l.cta.url} onChange={(v) => set("cta", { ...l.cta, url: v.trim() })} placeholder="https://" error={errorFor(issues, "cta.url", showErrors)} />
            <NumberInput label="Show after" value={l.cta.showAfterMinutes} onChange={(v) => set("cta", { ...l.cta, showAfterMinutes: Math.max(0, Math.round(v)) })} min={0} suffix="minutes" />
          </div>
        )}
      </SectionCard>

      <div className="flex items-center gap-2 text-xs text-secondaryText">
        <DoorOpen className="h-4 w-4" /> Room links are personal. They are included in confirmation and reminder emails.
      </div>
      <IssueSummary issues={issues} show={showErrors} />
    </div>
  );
}
