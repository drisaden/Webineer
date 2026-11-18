/**
 * One date and time style for everything people read: "15th Nov., 2026 6:40am".
 * Pass a time zone to show the time somewhere specific (a webinar's own zone). Without one, the runtime's zone is used,
 * which in the browser is the viewer's.
 */
const MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

function validZone(tz?: string): string | undefined {
  if (!tz) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

interface Parts { day: number; month: number; year: number; hour24: number; minute: number; weekday: number }

function parts(input: Date | string | number, timeZone?: string): Parts | null {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  const f = new Intl.DateTimeFormat("en-US", { timeZone: validZone(timeZone), year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23", weekday: "short" });
  const get: Record<string, string> = {};
  for (const p of f.formatToParts(date)) get[p.type] = p.value;
  return { day: Number(get.day), month: Number(get.month), year: Number(get.year), hour24: Number(get.hour) % 24, minute: Number(get.minute), weekday: Math.max(0, WEEKDAYS.indexOf(get.weekday)) };
}

const clock = (p: Parts) => `${p.hour24 % 12 || 12}:${String(p.minute).padStart(2, "0")}${p.hour24 < 12 ? "am" : "pm"}`;
const dayOf = (p: Parts) => `${ordinal(p.day)} ${MONTHS[p.month - 1]}, ${p.year}`;

/** 15th Nov., 2026 */
export function formatDay(input: Date | string | number, timeZone?: string): string {
  const p = parts(input, timeZone);
  return p ? dayOf(p) : "";
}
/** 6:40am */
export function formatTime(input: Date | string | number, timeZone?: string): string {
  const p = parts(input, timeZone);
  return p ? clock(p) : "";
}
/** 15th Nov., 2026 6:40am */
export function formatDateTime(input: Date | string | number, timeZone?: string): string {
  const p = parts(input, timeZone);
  return p ? `${dayOf(p)} ${clock(p)}` : "";
}
/** Wed, 15th Nov., 2026 */
export function formatDayWithWeekday(input: Date | string | number, timeZone?: string): string {
  const p = parts(input, timeZone);
  return p ? `${WEEKDAYS[p.weekday]}, ${dayOf(p)}` : "";
}
/** Short zone name such as "WAT" or "GMT+1". */
export function zoneName(input: Date | string | number, timeZone?: string): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: validZone(timeZone), timeZoneName: "short" }).formatToParts(date).find((x) => x.type === "timeZoneName")?.value ?? "";
}
