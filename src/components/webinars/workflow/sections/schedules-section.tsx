"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CalendarRange, Clock, Plus, Repeat, Trash2 } from "lucide-react";
import { randomId } from "@/lib/webinar-workflow/defaults";
import { nextEvergreenSession } from "@/lib/webinar-workflow/sync";
import { formatInZone, listTimeZones, resolveSessions } from "@/lib/webinar-workflow/time";
import type { SessionStatus, WebinarWorkflowConfig } from "@/types";
import { Button } from "@/components/ui/button";
import {
  ChoiceChips,
  errorFor,
  IssueSummary,
  Notice,
  NumberInput,
  SectionCard,
  SelectInput,
  TextInput,
  Toggle,
  WEEKDAY_OPTIONS,
} from "../form-controls";
import type { SectionProps } from "../section-types";

export function SchedulesSection({ draft, update, issues, showErrors, goTo }: SectionProps) {
  const s = draft.schedules;
  const mode = draft.configuration.mode;
  const set = <K extends keyof typeof s>(key: K, value: (typeof s)[K]) => update("schedules", { ...s, [key]: value });
  const resolved = useMemo(() => resolveSessions(s), [s]);
  const tzOptions = listTimeZones(s.timezone).map((tz) => ({ value: tz, label: tz }));

  if (!mode) {
    return (
      <SectionCard title="Choose a configuration mode first" icon={<CalendarClock className="h-4 w-4" />}>
        <p className="text-sm text-secondaryText">
          Scheduling depends on whether the webinar starts right now, is scheduled for later or is always on.
        </p>
        <Button type="button" onClick={() => goTo("configuration")}>
          Go to Configuration
        </Button>
      </SectionCard>
    );
  }

  const toggleDay = (list: number[], day: number) => (list.includes(day) ? list.filter((d) => d !== day) : [...list, day].sort());

  return (
    <div className="space-y-5">
      <SectionCard title="Time & duration" description="All dates are stored with their timezone so attendees see the correct local time." icon={<Clock className="h-4 w-4" />}>
        <div className="grid gap-5 md:grid-cols-2">
          <SelectInput label="Timezone" value={s.timezone} onChange={(v) => set("timezone", v)} options={tzOptions} error={errorFor(issues, "timezone", showErrors)} />
          <NumberInput label="Duration" value={s.durationMinutes} onChange={(v) => set("durationMinutes", Math.max(0, Math.round(v)))} min={5} max={720} step={5} suffix="minutes" error={errorFor(issues, "durationMinutes", showErrors)} />
        </div>
        {mode === "right_now" && (
          <Notice>The webinar starts immediately when you publish, so no start date is needed. Duration controls the room window and follow-up timing.</Notice>
        )}
      </SectionCard>

      {mode === "schedule_later" && (
        <SectionCard
          title="Sessions"
          description="Add one or more dates. Registrants choose a session when more than one is open."
          icon={<CalendarRange className="h-4 w-4" />}
          actions={
            s.sessions.length < 30 ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => set("sessions", [...s.sessions, { id: randomId("ses", 6), date: "", time: s.sessions[s.sessions.length - 1]?.time ?? "18:00", status: "open" }])}>
                <Plus className="mr-1.5 h-4 w-4" /> Add session
              </Button>
            ) : null
          }
        >
          {s.sessions.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#9FB3D1] p-6 text-center text-sm text-secondaryText">
              No sessions yet. Add your first session date and start time.
            </div>
          )}
          {s.sessions.map((session, i) => (
            <div key={session.id} className="grid items-end gap-3 rounded-xl border border-border bg-[#F7F9FC] p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <TextInput label={`Session ${i + 1} date`} type="date" value={session.date} onChange={(v) => set("sessions", s.sessions.map((x) => (x.id === session.id ? { ...x, date: v } : x)))} error={errorFor(issues, `sessions.${i}`, showErrors)} />
              <TextInput label="Start time" type="time" value={session.time} onChange={(v) => set("sessions", s.sessions.map((x) => (x.id === session.id ? { ...x, time: v } : x)))} />
              <SelectInput<SessionStatus>
                label="Status"
                value={session.status}
                onChange={(v) => set("sessions", s.sessions.map((x) => (x.id === session.id ? { ...x, status: v } : x)))}
                options={[
                  { value: "open", label: "Open for registration" },
                  { value: "closed", label: "Closed" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
              />
              <button
                type="button"
                onClick={() => set("sessions", s.sessions.filter((x) => x.id !== session.id))}
                className="mb-1 inline-flex h-10 items-center justify-center gap-1 rounded-xl px-3 text-sm text-[#B33A3A] hover:bg-white"
                aria-label={`Remove session ${i + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <Toggle
            label="Repeat the first session"
            description="Generate a recurring schedule from session 1 (bounded to 52 occurrences)."
            checked={s.recurrence.enabled}
            onChange={(v) => set("recurrence", { ...s.recurrence, enabled: v })}
          />
          {s.recurrence.enabled && (
            <div className="space-y-4 rounded-xl border border-border p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <SelectInput
                  label="Pattern"
                  value={s.recurrence.pattern}
                  onChange={(v) => set("recurrence", { ...s.recurrence, pattern: v })}
                  options={[
                    { value: "daily", label: "Daily" },
                    { value: "weekly", label: "Weekly on selected days" },
                    { value: "weekdays", label: "Every weekday (Mon–Fri)" },
                    { value: "custom", label: "Custom: every N days on selected days" },
                  ]}
                />
                {s.recurrence.pattern !== "weekdays" && (
                  <NumberInput
                    label={s.recurrence.pattern === "weekly" ? "Every N weeks" : "Every N days"}
                    value={s.recurrence.interval}
                    onChange={(v) => set("recurrence", { ...s.recurrence, interval: Math.min(30, Math.max(1, Math.round(v))) })}
                    min={1}
                    max={30}
                  />
                )}
                <NumberInput label="Occurrences" value={s.recurrence.occurrences} onChange={(v) => set("recurrence", { ...s.recurrence, occurrences: Math.min(52, Math.max(1, Math.round(v))) })} min={1} max={52} />
              </div>
              {(s.recurrence.pattern === "weekly" || s.recurrence.pattern === "custom") && (
                <ChoiceChips label="On these days" options={WEEKDAY_OPTIONS} selected={s.recurrence.daysOfWeek} onToggle={(d) => set("recurrence", { ...s.recurrence, daysOfWeek: toggleDay(s.recurrence.daysOfWeek, d) })} />
              )}
              {showErrors && errorFor(issues, "recurrence.daysOfWeek", true) && <Notice tone="error">{errorFor(issues, "recurrence.daysOfWeek", true)}</Notice>}
              <TextInput label="End date" optional type="date" value={s.recurrence.endDate} onChange={(v) => set("recurrence", { ...s.recurrence, endDate: v })} error={errorFor(issues, "recurrence.endDate", showErrors)} />
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-primaryText">Upcoming schedule preview</p>
              <ul className="max-h-56 space-y-1.5 overflow-y-auto text-sm">
                {resolved.slice(0, 12).map((r) => {
                  const past = new Date(r.startsAt) <= new Date();
                  return (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                      <span className={past ? "text-secondaryText line-through" : "text-primaryText"}>{formatInZone(r.startsAt, s.timezone)}</span>
                      <span className="text-xs capitalize text-secondaryText">{past ? "past" : r.status}</span>
                    </li>
                  );
                })}
              </ul>
              {resolved.length > 12 && <p className="mt-1 text-xs text-secondaryText">+ {resolved.length - 12} more</p>}
            </div>
          )}
        </SectionCard>
      )}

      {mode === "always_on" && <EvergreenCard config={{ ...draft } as unknown as WebinarWorkflowConfig} />}
      {mode === "always_on" && (
        <SectionCard title="Evergreen session rhythm" description="Each registrant is placed into the next available session." icon={<Repeat className="h-4 w-4" />}>
          <SelectInput
            label="Session availability"
            value={s.evergreen.type}
            onChange={(v) => set("evergreen", { ...s.evergreen, type: v })}
            options={[
              { value: "instant", label: "Instant: watch immediately after registering" },
              { value: "next_interval", label: "Next interval: sessions every N minutes" },
              { value: "daily_slots", label: "Daily slots: fixed times on selected days" },
              { value: "recurring_days", label: "Recurring days: one time on selected days" },
            ]}
          />
          {s.evergreen.type === "next_interval" && (
            <NumberInput label="Interval" value={s.evergreen.intervalMinutes} onChange={(v) => set("evergreen", { ...s.evergreen, intervalMinutes: Math.min(1440, Math.max(5, Math.round(v))) })} min={5} max={1440} step={5} suffix="minutes" />
          )}
          {(s.evergreen.type === "daily_slots" || s.evergreen.type === "recurring_days") && (
            <>
              <ChoiceChips label="Available days" options={WEEKDAY_OPTIONS} selected={s.evergreen.allowedDays} onToggle={(d) => set("evergreen", { ...s.evergreen, allowedDays: toggleDay(s.evergreen.allowedDays, d) })} />
              <div className="space-y-2">
                <p className="text-sm font-medium text-primaryText">{s.evergreen.type === "daily_slots" ? "Session times" : "Session time"}</p>
                {s.evergreen.dailySlots.map((slot, i) => (
                  <div key={`${i}-${slot}`} className="flex items-center gap-2">
                    <input
                      type="time"
                      aria-label={`Session time ${i + 1}`}
                      className="input-field max-w-[12rem]"
                      value={slot}
                      onChange={(e) => set("evergreen", { ...s.evergreen, dailySlots: s.evergreen.dailySlots.map((x, j) => (j === i ? e.target.value : x)) })}
                    />
                    <button type="button" onClick={() => set("evergreen", { ...s.evergreen, dailySlots: s.evergreen.dailySlots.filter((_, j) => j !== i) })} className="rounded-lg p-2 text-[#B33A3A] hover:bg-[#FFF6F6]" aria-label={`Remove session time ${i + 1}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {(s.evergreen.type === "daily_slots" || s.evergreen.dailySlots.length === 0) && s.evergreen.dailySlots.length < 24 && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => set("evergreen", { ...s.evergreen, dailySlots: [...s.evergreen.dailySlots, "12:00"] })}>
                    <Plus className="mr-1.5 h-4 w-4" /> Add time
                  </Button>
                )}
              </div>
            </>
          )}
        </SectionCard>
      )}

      <SectionCard title="Registration window" description="Optional. Leave empty to accept registrations as soon as the webinar is published." icon={<CalendarClock className="h-4 w-4" />}>
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput label="Registration opens" optional type="datetime-local" value={s.registrationOpensAt} onChange={(v) => set("registrationOpensAt", v.slice(0, 16))} hint={`In ${s.timezone}`} error={errorFor(issues, "registrationOpensAt", showErrors)} />
          <TextInput label="Registration closes" optional type="datetime-local" value={s.registrationClosesAt} onChange={(v) => set("registrationClosesAt", v.slice(0, 16))} hint={`In ${s.timezone}`} error={errorFor(issues, "registrationClosesAt", showErrors)} />
        </div>
      </SectionCard>

      <IssueSummary issues={issues} show={showErrors} />
    </div>
  );
}

function EvergreenCard({ config }: { config: WebinarWorkflowConfig }) {
  // Computed after mount so server and client render the same markup.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setNow(new Date()), 0);
    return () => clearTimeout(timer);
  }, []);
  if (!now) return null;
  const next = nextEvergreenSession(config, now);
  return (
    <Notice>
      {next ? (
        <>
          A visitor registering now would join the session starting <strong>{formatInZone(next, config.schedules.timezone)}</strong>.
        </>
      ) : (
        "No upcoming evergreen session matches these rules in the next 14 days. Check the days and times below."
      )}
    </Notice>
  );
}
