"use client";

import { AlertTriangle, CheckCircle2, ExternalLink, Eye, Loader2, Pencil, Rocket, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WORKFLOW_SECTIONS } from "@/lib/webinar-workflow/defaults";
import { hostedRegistrationUrl } from "@/lib/webinar-workflow/embed";
import { formatInZone, resolveSessions } from "@/lib/webinar-workflow/time";
import type { WorkflowSectionKey } from "@/types";
import { CopyField, Notice, SectionCard } from "../form-controls";
import type { FinishProps } from "../section-types";
import { SECTION_ICONS } from "../workflow-timeline";

const MODE_LABEL = { right_now: "Right now", schedule_later: "Schedule for later", always_on: "Always on" } as const;

export function FinishSection({ draft, goTo, context, evaluation, onSaveDraft, onPublish, saving, publishing, publishError, justPublished }: FinishProps) {
  const published = context.status !== "draft";
  const d = draft;
  const sessions = resolveSessions(d.schedules).filter((s) => s.status !== "cancelled");
  const yes = (v: boolean) => (v ? "On" : "Off");

  const summary: Record<Exclude<WorkflowSectionKey, "finish">, [string, string][]> = {
    configuration: [
      ["Title", d.configuration.title || "—"],
      ["Host", d.configuration.hostName || "—"],
      ["Presenters", d.configuration.presenters.map((p) => p.name).filter(Boolean).join(", ") || "Host only"],
      ["Category", d.configuration.category || "—"],
      ["Mode", d.configuration.mode ? MODE_LABEL[d.configuration.mode] : "Not chosen"],
    ],
    schedules: [
      ["Timezone", d.schedules.timezone],
      ["Duration", `${d.schedules.durationMinutes} minutes`],
      [
        "Schedule",
        d.configuration.mode === "schedule_later"
          ? sessions.length
            ? `${sessions.length} session${sessions.length > 1 ? "s" : ""}, first ${formatInZone(sessions[0].startsAt, d.schedules.timezone)}`
            : "No sessions"
          : d.configuration.mode === "always_on"
            ? `Evergreen (${d.schedules.evergreen.type.replace("_", " ")})`
            : "Starts on publish",
      ],
      ["Registration window", d.schedules.registrationOpensAt || d.schedules.registrationClosesAt ? `${d.schedules.registrationOpensAt || "now"} → ${d.schedules.registrationClosesAt || "open"}` : "Always open"],
    ],
    registration: [
      ["Headline", d.registration.headline || "—"],
      ["Fields", ["Name", "Email", d.registration.phoneField !== "hidden" ? `Phone (${d.registration.phoneField})` : null, ...d.registration.customQuestions.map((q) => q.label || "Untitled question")].filter(Boolean).join(", ")],
      ["Capacity", d.registration.capacity === null ? "Unlimited" : String(d.registration.capacity)],
      ["Publishing", "Hosted page, inline embed, popup embed, registration button"],
      ["Allowed websites", d.registration.embed.allowedDomains.join(", ") || "Any"],
    ],
    notifications: [
      ["Confirmation", yes(d.notifications.confirmation.enabled)],
      ["Reminders", d.notifications.reminders.filter((r) => r.enabled).length ? d.notifications.reminders.filter((r) => r.enabled).map((r) => (r.minutesBefore % 1440 === 0 ? `${r.minutesBefore / 1440}d` : r.minutesBefore % 60 === 0 ? `${r.minutesBefore / 60}h` : `${r.minutesBefore}m`)).join(", ") + " before" : "None"],
      ["Host alerts", [d.notifications.host.newRegistration && "new registrations", d.notifications.host.readiness && "readiness"].filter(Boolean).join(", ") || "Off"],
      ["Follow-ups", `${[d.notifications.thankYouEmail.enabled && "thank-you", d.notifications.replayEmail.enabled && "replay"].filter(Boolean).join(", ") || "none"}${d.notifications.followUps.length ? ` + ${d.notifications.followUps.length} custom` : ""}`],
    ],
    integrations: [
      ["Video", d.integrations.video.url ? `${d.integrations.video.provider}: ${d.integrations.video.url}` : "—"],
      ["Payment", d.integrations.payment.enabled ? `${d.integrations.payment.currency} ${d.integrations.payment.price.toLocaleString()} ${context.payment.live ? "" : "(test mode)"}` : "Free"],
      ["Tracking", [d.integrations.analytics.googleAnalyticsId && "GA4", d.integrations.analytics.metaPixelId && "Meta Pixel"].filter(Boolean).join(", ") || "None"],
      ["Webhook", d.integrations.webhook.enabled ? d.integrations.webhook.url || "No URL" : "Off"],
    ],
    thankYou: [
      ["Headline", d.thankYou.headline || "—"],
      ["Calendar / sharing", `${yes(d.thankYou.addToCalendar)} / ${yes(d.thankYou.socialSharing)}`],
      ["Redirect", d.thankYou.redirectUrl || "None"],
    ],
    live: [
      ["Access", d.live.access === "registered" ? "Registered attendees (personal link)" : "Anyone with the link"],
      ["Room opens", `${d.live.entryOpensMinutesBefore} min before start`],
      ["Late join", d.live.allowLateJoin ? `Until ${d.live.lateJoinCutoffMinutes} min after start` : "Off"],
      ["Call to action", d.live.cta.enabled ? d.live.cta.label || "—" : "Off"],
    ],
    replay: d.replay.enabled
      ? [
          ["Replay", "Enabled"],
          ["Recording", d.replay.useLiveVideo ? "Webinar video" : d.replay.video.url || "—"],
          ["Access", d.replay.access.replace(/_/g, " ")],
          ["Expires", d.replay.expiration === "never" ? "Never" : d.replay.expiration === "date" ? d.replay.expiresOn || "—" : `${d.replay.expiresAfterDays} days after the session`],
        ]
      : [["Replay", "Disabled"]],
  };

  const issueCount = evaluation.blockingIssues.length;
  const warnings = WORKFLOW_SECTIONS.flatMap((s) => evaluation.sections[s.key].issues.filter((i) => i.severity === "warning"));
  const registrationUrl = context.slug && context.appOrigin ? hostedRegistrationUrl(context.appOrigin, context.slug) : "";

  return (
    <div className="space-y-5">
      {justPublished && published && (
        <section className="rounded-[1.5rem] border border-[#BFEBD9] bg-[#EAFBF5] p-5 md:p-6" aria-live="polite">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#0F7B52]" />
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h3 className="text-lg text-[#0F5C3E]">Your webinar is published</h3>
                <p className="text-sm text-[#0F7B52]">Registrations are open on every publishing method.</p>
              </div>
              {registrationUrl && <CopyField label="Registration URL" value={registrationUrl} />}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => goTo("registration")}>
                  Get embed codes
                </Button>
                {context.webinarId && (
                  <Button asChild variant="secondary" size="sm">
                    <a href={`/dashboard/webinars/${context.webinarId}`}>Manage webinar</a>
                  </Button>
                )}
                {context.slug && (
                  <Button asChild size="sm">
                    <a href={`/w/${context.slug}`} target="_blank" rel="noopener">
                      Open registration page <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <SectionCard
        title={published ? "Review & update" : "Ready to publish?"}
        description={published ? "This webinar is live. Changes are saved straight to the published webinar." : "Publishing opens registration on the hosted page and all embeds."}
        icon={<Rocket className="h-4 w-4" />}
      >
        {issueCount > 0 ? (
          <Notice tone="error">
            {issueCount} issue{issueCount > 1 ? "s" : ""} must be fixed before {published ? "this webinar is fully valid" : "publishing"}.
          </Notice>
        ) : (
          <Notice tone="success">All required settings are complete{context.dirtySections.length ? " (unsaved changes will be saved first)" : ""}.</Notice>
        )}
        {publishError && <Notice tone="error">{publishError}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onSaveDraft} disabled={saving || publishing}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {published ? "Save changes" : "Save as draft"}
          </Button>
          {context.slug && (
            <Button asChild variant="secondary">
              <a href={`/w/${context.slug}${published ? "" : "?preview=1"}`} target="_blank" rel="noopener">
                <Eye className="mr-2 h-4 w-4" /> Preview webinar
              </a>
            </Button>
          )}
          {!published && (
            <Button type="button" onClick={onPublish} disabled={publishing || saving || issueCount > 0} aria-describedby="publish-hint">
              {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
              {publishing ? "Publishing…" : "Publish webinar"}
            </Button>
          )}
        </div>
        {!published && issueCount > 0 && (
          <p id="publish-hint" className="text-xs text-secondaryText">
            Publishing unlocks once the issues below are resolved.
          </p>
        )}
      </SectionCard>

      {(issueCount > 0 || warnings.length > 0) && (
        <SectionCard title="Validation" icon={<AlertTriangle className="h-4 w-4" />}>
          <ul className="space-y-2">
            {WORKFLOW_SECTIONS.flatMap((s) =>
              evaluation.sections[s.key].issues.map((issue) => (
                <li key={`${s.key}-${issue.message}`} className={cn("flex flex-wrap items-start justify-between gap-2 rounded-xl border p-3 text-sm", issue.severity === "error" ? "border-[#F5D7D7] bg-[#FFF6F6]" : "border-[#F5E1BC] bg-[#FFF8EA]")}>
                  <span className="min-w-0">
                    <span className="mr-2 text-xs font-semibold uppercase tracking-[0.08em] text-secondaryText">{s.label}</span>
                    <span className={issue.severity === "error" ? "text-[#B33A3A]" : "text-[#8A5A0E]"}>{issue.message}</span>
                  </span>
                  <button type="button" onClick={() => goTo(s.key)} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#17294B] underline">
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </li>
              )),
            )}
          </ul>
        </SectionCard>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {WORKFLOW_SECTIONS.filter((s) => s.key !== "finish").map((s) => {
          const Icon = SECTION_ICONS[s.key];
          const state = evaluation.sections[s.key].state;
          return (
            <section key={s.key} className="min-w-0 rounded-[1.25rem] border border-border bg-white p-4 shadow-soft" aria-labelledby={`summary-${s.key}`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#16D6B2]" aria-hidden />
                  <h3 id={`summary-${s.key}`} className="text-sm text-primaryText">
                    {s.label}
                  </h3>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", state === "completed" ? "bg-[#EAFBF5] text-[#0F7B52]" : state === "attention" ? "bg-[#FFF3DE] text-[#B87514]" : "bg-[#EEF2F7] text-[#64748B]")}>
                    {state === "completed" ? "Complete" : state === "attention" ? "Needs attention" : "Incomplete"}
                  </span>
                </div>
                <button type="button" onClick={() => goTo(s.key)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#17294B] hover:bg-[#EEF2F7]" aria-label={`Edit ${s.label}`}>
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
              <dl className="space-y-1.5 text-sm">
                {summary[s.key as Exclude<WorkflowSectionKey, "finish">].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[8.5rem_1fr] gap-2">
                    <dt className="text-secondaryText">{label}</dt>
                    <dd className="min-w-0 break-words text-primaryText">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </div>
  );
}
