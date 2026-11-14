import type { Webinar, WebinarWorkflowConfig, WebinarType } from "@/types";
import { buildRegistrationUrl } from "@/providers/video";
import { resolveSessions, todayInZone, zonedDateTimeToUtc, zonedToUtc } from "./time";

const DAY_NAMES = [0, 1, 2, 3, 4, 5, 6];

export function modeToWebinarType(config: WebinarWorkflowConfig): WebinarType {
  switch (config.configuration.mode) {
    case "always_on":
      return "evergreen";
    case "schedule_later":
      return config.schedules.recurrence.enabled ? "recurring" : "live";
    default:
      return "live";
  }
}

/**
 * Next evergreen session start (UTC) at or after `now`, following the evergreen
 * rules. Returns null when no slot is found within 14 days.
 */
export function nextEvergreenSession(config: WebinarWorkflowConfig, now = new Date()): Date | null {
  const e = config.schedules.evergreen;
  const tz = config.schedules.timezone;
  if (e.type === "instant") return now;
  if (e.type === "next_interval") {
    const step = Math.max(5, e.intervalMinutes) * 60_000;
    return new Date(Math.ceil(now.getTime() / step) * step);
  }
  const slots = e.dailySlots.filter(Boolean).sort();
  const allowed = e.allowedDays.length ? e.allowedDays : DAY_NAMES;
  const today = todayInZone(tz, now);
  for (let offset = 0; offset < 14; offset += 1) {
    const [y, m, d] = today.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10);
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (!allowed.includes(dow)) continue;
    for (const slot of slots) {
      const start = zonedToUtc(date, slot, tz);
      if (start && start > now) return start;
    }
  }
  return null;
}

/** Start/end of the "current" session used for room windows and replay availability. */
export function primarySessionWindow(webinar: Webinar, now = new Date()): { startsAt: Date; endsAt: Date } {
  const config = webinar.workflow;
  const durationMs = (config?.schedules.durationMinutes || 60) * 60_000;
  if (!config) {
    const startsAt = new Date(webinar.schedule.startsAt);
    const endsAt = webinar.schedule.endsAt ? new Date(webinar.schedule.endsAt) : new Date(startsAt.getTime() + durationMs);
    return { startsAt, endsAt };
  }
  if (config.configuration.mode === "schedule_later") {
    const sessions = resolveSessions(config.schedules).filter((s) => s.status !== "cancelled");
    // Pick the session that is running now, else the next upcoming, else the last one.
    const running = sessions.find((s) => new Date(s.startsAt) <= now && new Date(s.endsAt) > now);
    const upcoming = sessions.find((s) => new Date(s.startsAt) > now);
    const chosen = running ?? upcoming ?? sessions[sessions.length - 1];
    if (chosen) return { startsAt: new Date(chosen.startsAt), endsAt: new Date(chosen.endsAt) };
  }
  if (config.configuration.mode === "right_now") {
    const startsAt = new Date(config.publishedAt ?? webinar.schedule.startsAt);
    return { startsAt, endsAt: new Date(startsAt.getTime() + durationMs) };
  }
  // Always on: every attendee gets a rolling window starting now.
  return { startsAt: now, endsAt: new Date(now.getTime() + durationMs) };
}

/** Registration window state shared by every registration method. */
export function registrationWindow(webinar: Webinar, now = new Date()): { open: boolean; reason?: string } {
  const config = webinar.workflow;
  if (!config) return { open: true };
  const tz = config.schedules.timezone;
  const opens = config.schedules.registrationOpensAt ? zonedDateTimeToUtc(config.schedules.registrationOpensAt, tz) : null;
  const closes = config.schedules.registrationClosesAt ? zonedDateTimeToUtc(config.schedules.registrationClosesAt, tz) : null;
  if (opens && now < opens) return { open: false, reason: "Registration has not opened yet." };
  if (closes && now >= closes) return { open: false, reason: "Registration for this webinar has closed." };
  if (config.configuration.mode === "schedule_later") {
    const upcoming = resolveSessions(config.schedules).filter((s) => s.status === "open" && new Date(s.startsAt) > now);
    if (upcoming.length === 0) return { open: false, reason: "There are no upcoming sessions open for registration." };
  }
  return { open: true };
}

/**
 * Project the workflow configuration onto the existing Webinar fields so the
 * listing, detail, room and analytics pages keep working unchanged.
 */
export function applyWorkflowToWebinar(webinar: Webinar, config: WebinarWorkflowConfig, now = new Date()): Webinar {
  const c = config.configuration;
  const s = config.schedules;
  const durationMs = Math.max(5, s.durationMinutes || 60) * 60_000;
  const sessions = resolveSessions(s);
  const openSessions = sessions.filter((x) => x.status === "open");
  const upcoming = openSessions.filter((x) => new Date(x.startsAt) > now);

  let startsAt = webinar.schedule.startsAt;
  let sessionSlots: string[] | undefined;
  let evergreenConfig = undefined as Webinar["schedule"]["evergreenConfig"];
  let recurringConfig = undefined as Webinar["schedule"]["recurringConfig"];

  if (c.mode === "schedule_later") {
    const first = upcoming[0] ?? openSessions[0] ?? sessions[0];
    if (first) startsAt = first.startsAt;
    sessionSlots = openSessions.map((x) => x.startsAt);
    if (s.recurrence.enabled && s.sessions[0]) {
      recurringConfig = {
        frequency: s.recurrence.pattern === "daily" ? "daily" : "weekly",
        interval: s.recurrence.interval,
        daysOfWeek: s.recurrence.pattern === "weekdays" ? [1, 2, 3, 4, 5] : s.recurrence.daysOfWeek,
        timeOfDay: s.sessions[0].time,
        startDate: s.sessions[0].date,
        endDate: s.recurrence.endDate || undefined,
        maxOccurrences: s.recurrence.occurrences,
      };
    }
  } else if (c.mode === "right_now") {
    startsAt = config.publishedAt ?? now.toISOString();
  } else if (c.mode === "always_on") {
    startsAt = (nextEvergreenSession(config, now) ?? now).toISOString();
    evergreenConfig = {
      type: s.evergreen.type,
      intervalMinutes: s.evergreen.intervalMinutes,
      dailySlots: s.evergreen.dailySlots,
      allowedDays: s.evergreen.allowedDays,
      allowInstantWatch: s.evergreen.type === "instant",
    };
  }

  const isEvergreen = c.mode === "always_on";
  const slug = webinar.slug ?? webinar.id;

  return {
    ...webinar,
    title: c.title.trim() || "Untitled webinar",
    description: c.description.trim(),
    type: modeToWebinarType(config),
    tags: c.category ? [c.category.toLowerCase()] : webinar.tags,
    videoSource: {
      ...webinar.videoSource,
      provider: config.integrations.video.provider,
      url: config.integrations.video.url.trim(),
      title: c.title.trim() || webinar.videoSource.title,
      isEmbedded: config.integrations.video.provider !== "custom_url",
      thumbnailUrl: c.coverImageUrl || undefined,
      durationSeconds: s.durationMinutes * 60,
    },
    schedule: {
      ...webinar.schedule,
      startsAt,
      endsAt: new Date(new Date(startsAt).getTime() + durationMs).toISOString(),
      timezone: s.timezone,
      sessionSlots,
      evergreenConfig,
      recurringConfig,
    },
    automatedSettings: {
      allowLateJoin: config.live.allowLateJoin,
      lateJoinCutoffMinutes: config.live.lateJoinCutoffMinutes,
      entryOpenMinutesBefore: config.live.entryOpensMinutesBefore,
      enableReplay: config.replay.enabled,
      replayExpiryDays: config.replay.expiration === "days_after" ? config.replay.expiresAfterDays : undefined,
      redirectUrlAfterFinish: undefined,
      showLiveBadge: !isEvergreen,
      isPreRecorded: isEvergreen,
    },
    registrationUrl: buildRegistrationUrl(slug),
    workflow: config,
  };
}
