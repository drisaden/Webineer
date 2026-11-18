import { formatDateTime, zoneName } from "@/lib/datetime";
import type { SchedulesSettings, WorkflowRecurrence } from "@/types";

/** Hard cap on generated occurrences so recurring schedules stay bounded. */
export const MAX_GENERATED_OCCURRENCES = 52;

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Curated, deterministic timezone list (identical on server and client so the
 * select never causes a hydration mismatch). The current value is always kept.
 */
const TIME_ZONES = [
  "UTC",
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Cairo",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Africa/Casablanca",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Lisbon",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Perth",
  "Australia/Sydney",
  "Pacific/Auckland",
  "America/St_Johns",
  "America/Halifax",
  "America/New_York",
  "America/Toronto",
  "America/Chicago",
  "America/Mexico_City",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Sao_Paulo",
  "America/Bogota",
  "America/Lima",
  "America/Argentina/Buenos_Aires",
];

export function listTimeZones(current?: string): string[] {
  return current && !TIME_ZONES.includes(current) ? [current, ...TIME_ZONES] : TIME_ZONES;
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - instant.getTime();
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidLocalDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidLocalTime(value: string): boolean {
  return TIME_RE.test(value);
}

/**
 * Convert a wall-clock date + time in an IANA timezone to a UTC Date.
 * Handles DST by re-evaluating the offset at the candidate instant.
 */
export function zonedToUtc(date: string, time: string, timeZone: string): Date | null {
  if (!isValidLocalDate(date) || !isValidLocalTime(time) || !isValidTimeZone(timeZone)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let guess = naive - zoneOffsetMs(new Date(naive), timeZone);
  // Second pass corrects for DST transitions between the naive and real instant.
  guess = naive - zoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess);
}

/** Parse "YYYY-MM-DDTHH:mm" local datetime in a timezone. */
export function zonedDateTimeToUtc(localDateTime: string, timeZone: string): Date | null {
  if (!localDateTime) return null;
  const [date, time] = localDateTime.split("T");
  return zonedToUtc(date ?? "", (time ?? "").slice(0, 5), timeZone);
}

export function formatInZone(iso: string | Date, timeZone: string, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "";
  const tz = isValidTimeZone(timeZone) ? timeZone : "UTC";
  // Default style for everything attendees and hosts read: "15th Nov., 2026 6:40am WAT".
  if (!options) return `${formatDateTime(date, tz)} ${zoneName(date, tz)}`.trim();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    ...options,
  }).format(date);
}

/** Today's date (YYYY-MM-DD) in the timezone. */
export function todayInZone(timeZone: string, now = new Date()): string {
  const tz = isValidTimeZone(timeZone) ? timeZone : "UTC";
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Expand a recurrence rule from a start date into local dates (bounded). */
export function expandRecurrence(startDate: string, rule: WorkflowRecurrence): string[] {
  if (!isValidLocalDate(startDate)) return [];
  const limit = Math.min(Math.max(1, rule.occurrences || 1), MAX_GENERATED_OCCURRENCES);
  const end = rule.endDate && isValidLocalDate(rule.endDate) ? rule.endDate : null;
  const interval = Math.max(1, rule.interval || 1);
  const out: string[] = [];

  const accept = (date: string) => {
    if (end && date > end) return false;
    out.push(date);
    return out.length < limit;
  };

  if (rule.pattern === "daily") {
    let cursor = startDate;
    for (let i = 0; i < 2000 && accept(cursor); i += 1) cursor = addDays(cursor, interval);
    return out;
  }

  const days =
    rule.pattern === "weekdays"
      ? [1, 2, 3, 4, 5]
      : rule.daysOfWeek.length > 0
        ? rule.daysOfWeek
        : [weekday(startDate)];
  const weekStep = rule.pattern === "weekly" ? interval : 1;
  const dayStep = rule.pattern === "custom" ? interval : 1;

  // Walk day by day; weekly patterns only accept weeks that match the interval.
  let cursor = startDate;
  for (let i = 0; i < 3000; i += 1) {
    const daysFromStart = i;
    const weekIndex = Math.floor(daysFromStart / 7);
    const weekMatches = weekIndex % weekStep === 0;
    const dayMatches = rule.pattern === "custom" ? daysFromStart % dayStep === 0 : true;
    if (weekMatches && dayMatches && days.includes(weekday(cursor))) {
      if (!accept(cursor)) break;
    }
    if (end && cursor > end) break;
    cursor = addDays(cursor, 1);
  }
  return out;
}

export interface ResolvedSession {
  id: string;
  startsAt: string;
  endsAt: string;
  status: "open" | "closed" | "cancelled";
}

/** Resolve the configured sessions (incl. recurrence) into UTC instants, sorted. */
export function resolveSessions(schedules: SchedulesSettings): ResolvedSession[] {
  const tz = schedules.timezone;
  const durationMs = Math.max(1, schedules.durationMinutes || 60) * 60_000;
  const result: ResolvedSession[] = [];

  schedules.sessions.forEach((session, index) => {
    const dates =
      index === 0 && schedules.recurrence.enabled
        ? expandRecurrence(session.date, schedules.recurrence)
        : [session.date];
    dates.forEach((date, occurrence) => {
      const start = zonedToUtc(date, session.time, tz);
      if (!start) return;
      result.push({
        id: occurrence === 0 ? session.id : `${session.id}_r${occurrence}`,
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + durationMs).toISOString(),
        status: session.status,
      });
    });
  });

  return result.sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, MAX_GENERATED_OCCURRENCES);
}
