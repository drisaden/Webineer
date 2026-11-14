"use client";

import { CalendarPlus, CheckCircle2, ExternalLink, PartyPopper, Share2 } from "lucide-react";
import { errorFor, IssueSummary, NumberInput, SectionCard, TextArea, TextInput, Toggle } from "../form-controls";
import type { SectionProps } from "../section-types";

export function ThankYouSection({ draft, update, issues, showErrors }: SectionProps) {
  const t = draft.thankYou;
  const set = <K extends keyof typeof t>(key: K, value: (typeof t)[K]) => update("thankYou", { ...t, [key]: value });
  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <SectionCard title="Thank-you page" description="Shown after registration on the hosted page and inside embedded forms." icon={<PartyPopper className="h-4 w-4" />}>
          <TextInput label="Headline" value={t.headline} onChange={(v) => set("headline", v)} maxLength={150} error={errorFor(issues, "headline", showErrors)} />
          <TextArea label="Confirmation message" value={t.message} onChange={(v) => set("message", v)} rows={3} maxLength={2000} error={errorFor(issues, "message", showErrors)} />
          <TextArea label="How to join" optional value={t.joinInstructions} onChange={(v) => set("joinInstructions", v)} rows={3} maxLength={2000} />
          <Toggle label="Show webinar details" description="Title, date, time and timezone." checked={t.showWebinarDetails} onChange={(v) => set("showWebinarDetails", v)} />
          <Toggle label="Add-to-calendar buttons" description="Google Calendar link and a downloadable .ics file." checked={t.addToCalendar} onChange={(v) => set("addToCalendar", v)} />
          <Toggle label="Social sharing" description="Let registrants share the registration page." checked={t.socialSharing} onChange={(v) => set("socialSharing", v)} />
        </SectionCard>
        <SectionCard title="Redirect" description="Optionally send registrants to your own page after registering." icon={<ExternalLink className="h-4 w-4" />}>
          <TextInput label="Redirect URL" optional value={t.redirectUrl} onChange={(v) => set("redirectUrl", v.trim())} placeholder="https://example.com/welcome" error={errorFor(issues, "redirectUrl", showErrors)} />
          {t.redirectUrl && <NumberInput label="Redirect after" value={t.redirectDelaySeconds} onChange={(v) => set("redirectDelaySeconds", Math.min(60, Math.max(0, Math.round(v))))} min={0} max={60} suffix="seconds" hint="Inside embedded forms a ‘Continue’ button is shown, because browsers block automatic redirects from embeds." />}
        </SectionCard>
      </div>
      <SectionCard title="Preview" icon={<CheckCircle2 className="h-4 w-4" />}>
        <div className="rounded-2xl border border-border bg-[#F7F9FC] p-5 text-center" aria-label="Thank-you page preview">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAFBF5] text-[#0F7B52]">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="mt-3 text-lg font-semibold text-primaryText">{t.headline || "Headline"}</p>
          <p className="mt-1 text-sm text-secondaryText">{t.message || "Confirmation message"}</p>
          {t.showWebinarDetails && (
            <div className="mt-4 rounded-xl border border-border bg-white p-3 text-left text-xs text-secondaryText">
              <p className="font-medium text-primaryText">{draft.configuration.title || "Webinar title"}</p>
              <p>Date & time in {draft.schedules.timezone}</p>
            </div>
          )}
          {t.joinInstructions && <p className="mt-3 text-left text-xs text-secondaryText">{t.joinInstructions}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
            {t.addToCalendar && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5">
                <CalendarPlus className="h-3.5 w-3.5" /> Add to calendar
              </span>
            )}
            {t.socialSharing && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5">
                <Share2 className="h-3.5 w-3.5" /> Share
              </span>
            )}
          </div>
          {t.redirectUrl && <p className="mt-3 text-[11px] text-secondaryText">Redirects to {t.redirectUrl} after {t.redirectDelaySeconds}s</p>}
        </div>
      </SectionCard>
      <div className="xl:col-span-2">
        <IssueSummary issues={issues} show={showErrors} />
      </div>
    </div>
  );
}
