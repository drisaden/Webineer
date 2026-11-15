"use client";

import { CalendarClock, ImageIcon, Infinity as InfinityIcon, Plus, Trash2, UserRound, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { randomId, WEBINAR_CATEGORIES } from "@/lib/webinar-workflow/defaults";

import { listTimeZones } from "@/lib/webinar-workflow/time";
import type { WebinarConfigurationMode } from "@/types";
import { errorFor, IssueSummary, Notice, SectionCard, SelectInput, TextArea, TextInput } from "../form-controls";
import { MediaUploadField } from "@/components/uploads/media-upload-field";
import type { SectionProps } from "../section-types";

const MODES: { value: WebinarConfigurationMode; title: string; description: string; icon: typeof Zap }[] = [
  { value: "right_now", title: "Right now", description: "Start immediately. The room opens as soon as you publish.", icon: Zap },
  { value: "schedule_later", title: "Schedule for later", description: "Pick a future date and time, then build up registrations.", icon: CalendarClock },
  { value: "always_on", title: "Always on", description: "Evergreen webinar with continuous registration and rolling sessions.", icon: InfinityIcon },
];

export function ConfigurationSection({ draft, update, issues, showErrors, goTo, context }: SectionProps) {
  const c = draft.configuration;
  const set = <K extends keyof typeof c>(key: K, value: (typeof c)[K]) => update("configuration", { ...c, [key]: value });
  const firstSession = draft.schedules.sessions[0];

  const setMode = (mode: WebinarConfigurationMode) => {
    update("configuration", { ...c, mode });
  };

  const setFirstSession = (patch: Partial<{ date: string; time: string }>) => {
    const sessions = [...draft.schedules.sessions];
    sessions[0] = { id: sessions[0]?.id ?? randomId("ses", 6), date: sessions[0]?.date ?? "", time: sessions[0]?.time ?? "", status: sessions[0]?.status ?? "open", ...patch };
    update("schedules", { ...draft.schedules, sessions });
  };

  return (
    <div className="space-y-5">
      <SectionCard title="Basic information" description="How your webinar appears on the registration page, emails and in the room." icon={<ImageIcon className="h-4 w-4" />}>
        <TextInput label="Webinar title" value={c.title} onChange={(v) => set("title", v)} placeholder="e.g. Launch Your First Online Course" maxLength={150} error={errorFor(issues, "title", showErrors)} />
        <TextArea label="Short description" value={c.description} onChange={(v) => set("description", v)} rows={3} maxLength={2000} placeholder="What will attendees learn?" error={errorFor(issues, "description", showErrors)} />
        <div className="grid gap-5 md:grid-cols-2">
          <MediaUploadField
            label="Cover image"
            optional
            value={c.coverImageUrl}
            onChange={(v) => set("coverImageUrl", v)}
            placeholder="https://…/cover.jpg"
            error={errorFor(issues, "coverImageUrl", showErrors)}
          />
          <SelectInput
            label="Category"
            optional
            value={c.category}
            onChange={(v) => set("category", v)}
            options={[{ value: "", label: "Choose a category" }, ...WEBINAR_CATEGORIES.map((x) => ({ value: x, label: x }))]}
          />
        </div>
      </SectionCard>

      <SectionCard title="Host & presenters" description="Shown on the registration page and in the webinar room." icon={<UserRound className="h-4 w-4" />}>
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput label="Host name" value={c.hostName} onChange={(v) => set("hostName", v)} error={errorFor(issues, "hostName", showErrors)} />
          <TextInput label="Host email" optional type="email" value={c.hostEmail} onChange={(v) => set("hostEmail", v.trim())} hint="Used as the default for host notifications." error={errorFor(issues, "hostEmail", showErrors)} />
        </div>

        <div className="space-y-3">
          {c.presenters.length === 0 && <p className="text-sm text-secondaryText">No presenters added. The host is shown by default.</p>}
          {c.presenters.map((p, i) => (
            <div key={p.id} className="rounded-xl border border-border bg-[#F7F9FC] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-primaryText">Presenter {i + 1}</span>
                <button
                  type="button"
                  onClick={() => set("presenters", c.presenters.filter((x) => x.id !== p.id))}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#B33A3A] hover:bg-white"
                  aria-label={`Remove presenter ${i + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput label="Name" value={p.name} onChange={(v) => set("presenters", c.presenters.map((x) => (x.id === p.id ? { ...x, name: v } : x)))} error={errorFor(issues, `presenters.${i}`, showErrors)} />
                <TextInput label="Role / title" optional value={p.title} onChange={(v) => set("presenters", c.presenters.map((x) => (x.id === p.id ? { ...x, title: v } : x)))} />
                <MediaUploadField label="Photo" optional compact value={p.avatarUrl} onChange={(v) => set("presenters", c.presenters.map((x) => (x.id === p.id ? { ...x, avatarUrl: v } : x)))} placeholder="https://…" />
                <TextInput label="Short bio" optional value={p.bio} onChange={(v) => set("presenters", c.presenters.map((x) => (x.id === p.id ? { ...x, bio: v } : x)))} maxLength={1000} />
              </div>
            </div>
          ))}
          {c.presenters.length < 10 && (
            <button
              type="button"
              onClick={() => set("presenters", [...c.presenters, { id: randomId("pr", 6), name: "", title: "", bio: "", avatarUrl: "" }])}
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#9FB3D1] px-3 py-2 text-sm font-medium text-[#17294B] hover:bg-[#F7F9FC]"
            >
              <Plus className="h-4 w-4" /> Add presenter
            </button>
          )}
        </div>
      </SectionCard>

      <SectionCard title="How should this webinar run?" description="The mode decides which scheduling and availability options apply." icon={<Users className="h-4 w-4" />}>
        <div role="radiogroup" aria-label="Webinar configuration mode" className="grid gap-3 md:grid-cols-3">
          {MODES.map((mode) => {
            const selected = c.mode === mode.value;
            const Icon = mode.icon;
            return (
              <button
                key={mode.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMode(mode.value)}
                className={cn(
                  "flex h-full flex-col items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0AEBCB]/60",
                  selected ? "border-[#041B5E] bg-[#EEF5FF] shadow-[0_10px_24px_rgba(4,27,94,0.10)]" : "border-border bg-white hover:border-[#9FB3D1]",
                )}
              >
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", selected ? "bg-[#041B5E] text-white" : "bg-[#EAFBF5] text-[#0F7B52]")}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-primaryText">{mode.title}</span>
                  <span className="mt-1 block text-xs text-secondaryText">{mode.description}</span>
                </span>
              </button>
            );
          })}
        </div>
        {showErrors && errorFor(issues, "mode", true) && <Notice tone="error">{errorFor(issues, "mode", true)}</Notice>}

        {c.mode === "right_now" && (
          <div className="space-y-3 rounded-xl border border-border bg-[#F7F9FC] p-4 text-sm">
            <p className="font-medium text-primaryText">Readiness</p>
            <ul className="space-y-1.5 text-secondaryText">
              <ReadyItem ok={Boolean(draft.integrations.video.url)} label="Video source added (Integrations)" />
              <ReadyItem ok={Boolean(draft.registration.headline)} label="Registration page headline (Registration)" />
              <ReadyItem ok={context.status !== "draft"} label="Webinar published (Finish)" />
            </ul>
            <p className="text-xs text-secondaryText">
              Registration and the attendee room open the moment you publish. As the host you can open the room from the Finish step.
            </p>
          </div>
        )}

        {c.mode === "schedule_later" && (
          <div className="grid gap-4 rounded-xl border border-border bg-[#F7F9FC] p-4 md:grid-cols-3">
            <TextInput label="First session date" type="date" value={firstSession?.date ?? ""} onChange={(v) => setFirstSession({ date: v })} />
            <TextInput label="Start time" type="time" value={firstSession?.time ?? ""} onChange={(v) => setFirstSession({ time: v })} />
            <SelectInput
              label="Timezone"
              value={draft.schedules.timezone}
              onChange={(v) => update("schedules", { ...draft.schedules, timezone: v })}
              options={listTimeZones(draft.schedules.timezone).map((tz) => ({ value: tz, label: tz }))}
            />
            <p className="text-xs text-secondaryText md:col-span-3">
              Add more sessions, recurrence and the registration window in{" "}
              <button type="button" className="font-medium text-[#17294B] underline" onClick={() => goTo("schedules")}>
                Schedules
              </button>
              .
            </p>
          </div>
        )}

        {c.mode === "always_on" && (
          <div className="rounded-xl border border-border bg-[#F7F9FC] p-4 text-sm text-secondaryText">
            Registration stays open continuously and each registrant is placed into the next available session. Configure the session rhythm in{" "}
            <button type="button" className="font-medium text-[#17294B] underline" onClick={() => goTo("schedules")}>
              Schedules
            </button>{" "}
            and replay behaviour in{" "}
            <button type="button" className="font-medium text-[#17294B] underline" onClick={() => goTo("replay")}>
              Replay
            </button>
            .
          </div>
        )}
      </SectionCard>

      <IssueSummary issues={issues} show={showErrors} />
    </div>
  );
}

function ReadyItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-full", ok ? "bg-[#16A36A]" : "bg-[#CBD5E1]")} aria-hidden />
      <span className={ok ? "text-primaryText" : undefined}>{label}</span>
      <span className="sr-only">{ok ? "ready" : "not ready"}</span>
    </li>
  );
}
