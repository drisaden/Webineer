"use client";

import { startingEmailOf } from "@/lib/webinar-workflow/defaults";
import { useState } from "react";
import { BellRing, Eye, Mail, Plus, Send, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EMAIL_PLACEHOLDERS, randomId } from "@/lib/webinar-workflow/defaults";
import { applyPlaceholders, renderEmailHtml, SAMPLE_EMAIL_VARIABLES } from "@/lib/webinar-workflow/email-render";
import type { EmailMessageSettings } from "@/types";
import { errorFor, IssueSummary, Notice, NumberInput, SectionCard, TextArea, TextInput, Toggle } from "../form-controls";
import type { SectionProps } from "../section-types";

function EmailEditor({
  title,
  description,
  value,
  onChange,
  variables,
  errorPrefix,
  issues,
  showErrors,
  timing,
  onRemove,
}: {
  title: string;
  description?: string;
  value: EmailMessageSettings;
  onChange: (v: EmailMessageSettings) => void;
  variables: Record<string, string>;
  errorPrefix: string;
  issues: SectionProps["issues"];
  showErrors: boolean;
  timing?: React.ReactNode;
  onRemove?: () => void;
}) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-[#F7F9FC] p-4">
      <Toggle label={title} description={description} checked={value.enabled} onChange={(enabled) => onChange({ ...value, enabled })} />
      {value.enabled && (
        <div className="mt-4 space-y-4">
          {timing}
          <TextInput label="Subject" value={value.subject} onChange={(subject) => onChange({ ...value, subject })} maxLength={200} error={errorFor(issues, `${errorPrefix}.subject`, showErrors)} />
          <TextArea label="Message" value={value.body} onChange={(body) => onChange({ ...value, body })} rows={6} maxLength={5000} hint="Plain text. Use **bold** for emphasis; links become clickable." error={errorFor(issues, `${errorPrefix}.body`, showErrors)} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setPreview((p) => !p)} aria-expanded={preview}>
              <Eye className="mr-1.5 h-4 w-4" /> {preview ? "Hide preview" : "Preview email"}
            </Button>
            {onRemove && (
              <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-sm text-[#B33A3A]">
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            )}
          </div>
          {preview && (
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-xs text-secondaryText">Subject</p>
              <p className="font-medium text-primaryText">{applyPlaceholders(value.subject, variables)}</p>
              <hr className="my-3 border-border" />
              {/* Rendered from escaped text: user content cannot inject markup. */}
              <div className="text-sm leading-relaxed text-primaryText [&_a]:text-[#2457AA] [&_a]:underline" dangerouslySetInnerHTML={{ __html: renderEmailHtml(value.body, variables) }} />
              <p className="mt-3 text-[11px] text-secondaryText">Preview uses sample registrant data.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function NotificationsSection({ draft, update, issues, showErrors, goTo }: SectionProps) {
  const n = draft.notifications;
  const set = <K extends keyof typeof n>(key: K, value: (typeof n)[K]) => update("notifications", { ...n, [key]: value });
  const variables = { ...SAMPLE_EMAIL_VARIABLES, webinar_title: draft.configuration.title || "Your webinar", host_name: draft.configuration.hostName || "Your host", webinar_timezone: draft.schedules.timezone };
  const common = { variables, issues, showErrors };

  return (
    <div className="space-y-5">
      <Notice>
        Webineer sends these emails for you. Reminders and follow-ups go out automatically at the times you set below, and you can see every email sent in Emails.
      </Notice>

      <SectionCard title="Registration email" description="Sent immediately after a successful (and, for paid webinars, verified) registration." icon={<Mail className="h-4 w-4" />}>
        <EmailEditor title="Confirmation email" description="Includes webinar details, date, time and the personal join link." value={n.confirmation} onChange={(v) => set("confirmation", v)} errorPrefix="confirmation" {...common} />
      </SectionCard>

      <SectionCard
        title="Reminders"
        description={draft.configuration.mode === "always_on" ? "Timed relative to each registrant's evergreen session." : "Timed relative to the session start."}
        icon={<BellRing className="h-4 w-4" />}
        actions={
          n.reminders.length < 6 ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => set("reminders", [...n.reminders, { id: randomId("rem", 6), minutesBefore: 120, enabled: true, subject: "Reminder: {{webinar_title}}", body: "Hi {{first_name}},\n\nJust a reminder.\n\nJoin here: {{join_link}}" }])}>
              <Plus className="mr-1.5 h-4 w-4" /> Add reminder
            </Button>
          ) : null
        }
      >
        {draft.configuration.mode === "right_now" && <Notice tone="warning">Right-now webinars start on publish, so pre-session reminders only reach people who registered before the start.</Notice>}
        {n.reminders.map((reminder, i) => (
          <EmailEditor
            key={reminder.id}
            title={labelForMinutes(reminder.minutesBefore, "before")}
            value={reminder}
            onChange={(v) => set("reminders", n.reminders.map((r) => (r.id === reminder.id ? { ...r, ...v } : r)))}
            errorPrefix={`reminders.${i}`}
            onRemove={() => set("reminders", n.reminders.filter((r) => r.id !== reminder.id))}
            timing={<NumberInput label="Send before start" value={reminder.minutesBefore} onChange={(v) => set("reminders", n.reminders.map((r) => (r.id === reminder.id ? { ...r, minutesBefore: Math.max(1, Math.round(v)) } : r)))} min={1} max={20160} suffix="minutes" />}
            {...common}
          />
        ))}
      </SectionCard>

      <SectionCard title="At start time" icon={<Send className="h-4 w-4" />}>
        <EmailEditor
          title="Starting now"
          description="Sent at the exact start time of each session, in addition to the reminders. People who register after the start time don't get it."
          value={startingEmailOf(n)}
          onChange={(v) => set("startingEmail", { ...startingEmailOf(n), ...v })}
          errorPrefix="startingEmail"
          {...common}
        />
      </SectionCard>

      <SectionCard title="Host notifications" icon={<UserCog className="h-4 w-4" />}>
        <Toggle label="New registration" description="Email the host whenever someone registers." checked={n.host.newRegistration} onChange={(v) => set("host", { ...n.host, newRegistration: v })} />
        <Toggle label="Webinar readiness" description="Email the host when the webinar is published." checked={n.host.readiness} onChange={(v) => set("host", { ...n.host, readiness: v })} />
        {(n.host.newRegistration || n.host.readiness) && (
          <TextInput label="Send host notifications to" type="email" value={n.host.recipientEmail} onChange={(v) => set("host", { ...n.host, recipientEmail: v.trim() })} error={errorFor(issues, "host.recipientEmail", showErrors)} />
        )}
      </SectionCard>

      <SectionCard
        title="Follow-up emails"
        icon={<Send className="h-4 w-4" />}
        actions={
          n.followUps.length < 5 ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => set("followUps", [...n.followUps, { id: randomId("fu", 6), minutesAfter: 1440, enabled: true, subject: "Next steps after {{webinar_title}}", body: "Hi {{first_name}},\n\n" }])}>
              <Plus className="mr-1.5 h-4 w-4" /> Add follow-up
            </Button>
          ) : null
        }
      >
        <EmailEditor
          title="Post-webinar thank-you"
          value={n.thankYouEmail}
          onChange={(v) => set("thankYouEmail", { ...n.thankYouEmail, ...v })}
          errorPrefix="thankYouEmail"
          timing={<NumberInput label="Send after the session ends" value={n.thankYouEmail.minutesAfter} onChange={(v) => set("thankYouEmail", { ...n.thankYouEmail, minutesAfter: Math.max(0, Math.round(v)) })} min={0} suffix="minutes" />}
          {...common}
        />
        <EmailEditor
          title="Replay available"
          description={draft.replay.enabled ? "Sent when the session ends, with each registrant's personal replay link." : "Replay is disabled, so this email won't be sent."}
          value={n.replayEmail}
          onChange={(v) => set("replayEmail", v)}
          errorPrefix="replayEmail"
          {...common}
        />
        {!draft.replay.enabled && n.replayEmail.enabled && (
          <button type="button" className="text-sm font-medium text-[#17294B] underline" onClick={() => goTo("replay")}>
            Enable replay
          </button>
        )}
        {n.followUps.map((f, i) => (
          <EmailEditor
            key={f.id}
            title={`Follow-up ${i + 1} · ${labelForMinutes(f.minutesAfter, "after")}`}
            value={f}
            onChange={(v) => set("followUps", n.followUps.map((x) => (x.id === f.id ? { ...x, ...v } : x)))}
            errorPrefix={`followUps.${i}`}
            onRemove={() => set("followUps", n.followUps.filter((x) => x.id !== f.id))}
            timing={<NumberInput label="Send after the session ends" value={f.minutesAfter} onChange={(v) => set("followUps", n.followUps.map((x) => (x.id === f.id ? { ...x, minutesAfter: Math.max(0, Math.round(v)) } : x)))} min={0} suffix="minutes" />}
            {...common}
          />
        ))}
      </SectionCard>

      <SectionCard title="Placeholders" description="Insert these into any subject or message.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {EMAIL_PLACEHOLDERS.map((p) => (
            <li key={p.token} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <code className="text-xs text-[#17294B]">{p.token}</code>
              <span className="text-xs text-secondaryText">{p.description}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <IssueSummary issues={issues} show={showErrors} />
    </div>
  );
}

function labelForMinutes(minutes: number, direction: "before" | "after") {
  if (minutes % 1440 === 0 && minutes >= 1440) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"} ${direction}`;
  if (minutes % 60 === 0 && minutes >= 60) return `${minutes / 60} hour${minutes === 60 ? "" : "s"} ${direction}`;
  return `${minutes} minutes ${direction}`;
}
